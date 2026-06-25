/**
 * Sincroniza data/cms/* → Supabase (tabelas cms_collections + cms_account).
 *
 * Pré-requisito: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY no .env.local
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { COLLECTIONS } from "../lib/cms.js";
import { writeSupabaseCollection, writeSupabaseAccount } from "../lib/supabase/cms-storage.js";
import { hasSupabase } from "../lib/supabase/client.js";
import { loadProjectEnv } from "./load-env.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const CMS_DIR = join(ROOT, "data", "cms");

async function syncCollections() {
  for (const [name, filename] of Object.entries(COLLECTIONS)) {
    const raw = await readFile(join(CMS_DIR, filename), "utf8");
    const data = JSON.parse(raw);
    await writeSupabaseCollection(name, data);
    console.log(`✓ cms_collections.${name}`);
  }
}

async function syncAccount() {
  try {
    const raw = await readFile(join(CMS_DIR, "account.json"), "utf8");
    const account = JSON.parse(raw);
    await writeSupabaseAccount(account);
    console.log("✓ cms_account");
  } catch {
    console.log("· account.json ausente no repo (ok)");
  }
}

async function main() {
  await loadProjectEnv();

  if (!hasSupabase()) {
    console.error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  console.log(`Supabase: ${process.env.SUPABASE_URL}\n`);
  await syncCollections();
  await syncAccount();
  console.log("\n✓ CMS sincronizado com Supabase");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
