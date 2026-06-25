/**
 * Migra dados do Vercel Blob → Supabase (CMS + mídia pública).
 *
 * Ordem recomendada:
 * 1. npm run sync:supabase          (seed do repo, se ainda vazio)
 * 2. npm run migrate:blob-to-supabase (copia produção Blob → Supabase)
 *
 * Env necessário (.env.local):
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * - BLOB_READ_WRITE_TOKEN (store privada) e/ou BLOB_MEDIA_READ_WRITE_TOKEN
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { get, list } from "@vercel/blob";
import { COLLECTIONS } from "../lib/cms.js";
import {
  writeSupabaseCollection,
  writeSupabaseAccount,
} from "../lib/supabase/cms-storage.js";
import { uploadSupabaseMedia } from "../lib/supabase/media-storage.js";
import { hasSupabase } from "../lib/supabase/client.js";
import {
  getBlobClientOptions,
  getMediaBlobStoreId,
  getPrivateBlobStoreId,
} from "../lib/blob-storage.js";
import { loadProjectEnv } from "./load-env.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const CMS_DIR = join(ROOT, "data", "cms");

async function readBlobJson(pathname, storeId, access = "private") {
  try {
    const result = await get(pathname, { access, ...getBlobClientOptions(storeId) });
    if (result?.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function migrateCollections() {
  const privateStore = getPrivateBlobStoreId();

  for (const [name, filename] of Object.entries(COLLECTIONS)) {
    let data = await readBlobJson(`cms/${filename}`, privateStore, "private");
    if (data === null) {
      try {
        data = JSON.parse(await readFile(join(CMS_DIR, filename), "utf8"));
      } catch {
        console.warn(`⚠ ${name}: sem dados no Blob nem no repo`);
        continue;
      }
    }

    await writeSupabaseCollection(name, data);
    console.log(`✓ coleção ${name}`);
  }
}

async function migrateAccount() {
  const privateStore = getPrivateBlobStoreId();
  let account = await readBlobJson("cms/account.json", privateStore, "private");

  if (!account) {
    try {
      account = JSON.parse(await readFile(join(CMS_DIR, "account.json"), "utf8"));
    } catch {
      console.log("· conta: nada para migrar");
      return;
    }
  }

  await writeSupabaseAccount(account);
  console.log("✓ cms_account");
}

async function migrateMediaPrefix(prefix, storeId) {
  let cursor;
  let count = 0;

  do {
    const page = await list({
      prefix,
      limit: 1000,
      cursor,
      ...getBlobClientOptions(storeId),
    });

    for (const blob of page.blobs) {
      if (!blob.pathname.startsWith("media/")) continue;
      const objectPath = blob.pathname.replace(/^media\//, "");

      try {
        const res = await fetch(blob.url);
        if (!res.ok) continue;
        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = blob.contentType || res.headers.get("content-type") || "application/octet-stream";
        await uploadSupabaseMedia(objectPath, buffer, contentType);
        count += 1;
        console.log(`  ✓ ${objectPath}`);
      } catch (err) {
        console.warn(`  ⚠ ${objectPath}: ${err.message}`);
      }
    }

    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return count;
}

function hasBlobAccess() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
      process.env.BLOB_MEDIA_READ_WRITE_TOKEN?.trim() ||
      process.env.VERCEL_OIDC_TOKEN?.trim(),
  );
}

async function migrateMedia(storeId, label = "mídia pública") {
  if (!storeId) {
    console.log(`· ${label}: store id ausente`);
    return 0;
  }

  if (!hasBlobAccess()) {
    console.log(`· ${label}: sem credenciais Blob`);
    return 0;
  }

  console.log(`\nMigrando ${label}…`);
  try {
    const publicCount = await migrateMediaPrefix("media/assets/", storeId);
    console.log(`✓ ${publicCount} arquivo(s) — ${label}`);
    return publicCount;
  } catch (err) {
    console.warn(`⚠ ${label}: ${err.message}`);
    return 0;
  }
}

async function main() {
  await loadProjectEnv();

  if (!hasSupabase()) {
    console.error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim() && !getPrivateBlobStoreId()) {
    console.warn("Aviso: sem token Blob privado — coleções virão só do repo local.");
  }

  console.log(`Supabase: ${process.env.SUPABASE_URL}`);
  console.log("Migrando CMS…\n");
  await migrateCollections();
  await migrateAccount();
  await migrateMedia(getMediaBlobStoreId());
  await migrateMedia(getPrivateBlobStoreId(), "mídia legada (store privada)");
  console.log("\n✓ Migração Blob → Supabase concluída");
  console.log("\nPróximo passo: na Vercel, adicione STORAGE_PROVIDER=supabase e as vars Supabase.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
