/**
 * Migra mídia do CMS baixando de produção (/api/media/...) → Supabase Storage.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { COLLECTIONS, readCollection } from "../lib/cms.js";
import { uploadSupabaseMedia } from "../lib/supabase/media-storage.js";
import { hasSupabase } from "../lib/supabase/client.js";
import { isCmsUploadedMedia } from "../lib/media-url.js";
import { loadProjectEnv } from "./load-env.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SITE = process.env.SITE_ORIGIN || "https://ead-faculdade-ide.vercel.app";

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

function collectMediaPaths(value, out = new Set()) {
  if (value == null) return out;
  if (typeof value === "string") {
    const path = value.replace(/^\//, "");
    if (isCmsUploadedMedia(path)) out.add(path);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectMediaPaths(item, out);
    return out;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value)) collectMediaPaths(v, out);
  }
  return out;
}

async function migratePath(relativePath) {
  const url = `${SITE}/api/media/${relativePath}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = relativePath.slice(relativePath.lastIndexOf(".")).toLowerCase();
  const contentType = res.headers.get("content-type") || MIME[ext] || "application/octet-stream";
  await uploadSupabaseMedia(relativePath, buffer, contentType);
}

async function main() {
  await loadProjectEnv();
  if (!hasSupabase()) {
    console.error("Supabase não configurado.");
    process.exit(1);
  }

  const paths = new Set();
  for (const name of Object.keys(COLLECTIONS)) {
    const data = await readCollection(name);
    collectMediaPaths(data, paths);
  }

  console.log(`Origem: ${SITE}`);
  console.log(`${paths.size} arquivo(s) de mídia encontrados no CMS\n`);

  let ok = 0;
  let fail = 0;

  for (const path of [...paths].sort()) {
    try {
      await migratePath(path);
      ok += 1;
      console.log(`✓ ${path}`);
    } catch (err) {
      fail += 1;
      console.warn(`⚠ ${path}: ${err.message}`);
    }
  }

  console.log(`\n✓ ${ok} migrado(s), ${fail} falha(s)`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
