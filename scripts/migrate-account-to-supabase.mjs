/**
 * Migra cms/account.json (Blob ou env CMS_*) → Supabase cms_account.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { get } from "@vercel/blob";
import { writeSupabaseAccount, readSupabaseAccount } from "../lib/supabase/cms-storage.js";
import { hasSupabase } from "../lib/supabase/client.js";
import { getBlobClientOptions, getPrivateBlobStoreId } from "../lib/blob-storage.js";
import { loadProjectEnv } from "./load-env.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_PATH = join(ROOT, "data", "cms", "account.json");

async function readBlobAccount() {
  const storeId = getPrivateBlobStoreId();
  if (!storeId && !process.env.BLOB_READ_WRITE_TOKEN?.trim()) return null;

  try {
    const result = await get("cms/account.json", {
      access: "private",
      ...getBlobClientOptions(storeId),
    });
    if (result?.statusCode !== 200 || !result.stream) return null;
    return JSON.parse(await new Response(result.stream).text());
  } catch {
    return null;
  }
}

async function readRepoAccount() {
  try {
    return JSON.parse(await readFile(REPO_PATH, "utf8"));
  } catch {
    return null;
  }
}

function seedFromEnv() {
  return {
    username: process.env.CMS_USER?.trim() || "",
    passwordHash: null,
    email: process.env.CMS_EMAIL?.trim() || "",
  };
}

async function main() {
  await loadProjectEnv();

  if (!hasSupabase()) {
    console.error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const existing = await readSupabaseAccount();
  if (existing?.username) {
    console.log(`· cms_account já existe (${existing.username}) — use --force para sobrescrever`);
    if (!process.argv.includes("--force")) return;
  }

  let account = null;
  let source = "env CMS_*";

  const fromBlob = await readBlobAccount();
  if (fromBlob) {
    account = fromBlob;
    source = "Blob";
  } else {
    const fromRepo = await readRepoAccount();
    if (fromRepo) {
      account = fromRepo;
      source = "repo local";
    } else {
      account = seedFromEnv();
    }
  }

  await writeSupabaseAccount(account);
  console.log(`✓ cms_account migrado (${source}) — usuário: ${account.username}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
