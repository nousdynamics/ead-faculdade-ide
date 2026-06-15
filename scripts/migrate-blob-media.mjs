/**
 * Migra mídia para a store pública (ead-faculdade-ide-blob-public).
 *
 * 1. Copia blobs media/* e templates/* da store privada (se existirem)
 * 2. Envia assets locais (assets/img, assets/docs) para media/assets/...
 *
 * Autenticação (uma das opções):
 *   - BLOB_MEDIA_READ_WRITE_TOKEN no .env.local (recomendado localmente)
 *   - OIDC em runtime Vercel (POST /api/migrate-blob-media autenticado)
 *
 * Pré-requisito local:
 *   npx vercel env pull .env.production.local --environment production --yes
 *   + token RW da store pública no dashboard Vercel → Storage → blob-public
 *
 * Uso:
 *   npm run migrate:blob-media           # dry-run
 *   npm run migrate:blob-media -- --apply
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { get, head, list, put } from "@vercel/blob";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");

const MEDIA_PREFIXES = ["media/", "templates/"];
const LOCAL_ASSET_DIRS = [join(ROOT, "assets", "img"), join(ROOT, "assets", "docs")];

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

function loadEnvFile(filename) {
  const path = join(ROOT, filename);
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        let value = line.slice(index + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return [key, value];
      }),
  );
}

function mergeEnv() {
  for (const file of [".env.local", ".env.development.local", ".env.production.local", ".env"]) {
    const parsed = loadEnvFile(file);
    for (const [key, value] of Object.entries(parsed)) {
      if (value) process.env[key] = value;
    }
  }
}

function cleanEnv(value) {
  return String(value || "")
    .trim()
    .replace(/^"|"$/g, "");
}

function getPrivateStoreId() {
  return cleanEnv(process.env.BLOB_STORE_ID) || "store_i80YqqvfBoSS9Iv7";
}

function getPublicStoreId() {
  return (
    cleanEnv(process.env.BLOB_MEDIA_STORE_ID) ||
    cleanEnv(process.env.OFC_STORE_ID) ||
    "store_dCeVSERsUNiDaH6Z"
  );
}

function getMediaToken() {
  return cleanEnv(process.env.BLOB_MEDIA_READ_WRITE_TOKEN) || cleanEnv(process.env.BLOB_READ_WRITE_TOKEN);
}

function privateOptions() {
  const storeId = getPrivateStoreId();
  const token = getMediaToken();
  const oidcToken = cleanEnv(process.env.VERCEL_OIDC_TOKEN);
  if (token) return { storeId, token, access: "private" };
  if (oidcToken) return { storeId, oidcToken, access: "private" };
  throw new Error("Defina BLOB_MEDIA_READ_WRITE_TOKEN ou VERCEL_OIDC_TOKEN para ler a store privada.");
}

function publicPutOptions() {
  const token = getMediaToken();
  if (!token) {
    throw new Error(
      "Defina BLOB_MEDIA_READ_WRITE_TOKEN (Vercel → Storage → ead-faculdade-ide-blob-public → .env.local).",
    );
  }
  return { token, access: "public" };
}

function contentTypeFromPath(path) {
  return MIME_BY_EXT[extname(path).toLowerCase()] || "application/octet-stream";
}

async function listStoreBlobs(options, prefix) {
  const blobs = [];
  let cursor;

  do {
    const page = await list({ prefix, limit: 1000, cursor, ...options });
    blobs.push(...page.blobs);
    cursor = page.cursor;
  } while (cursor);

  return blobs;
}

async function publicBlobExists(pathname) {
  try {
    return Boolean(await head(pathname, publicPutOptions()));
  } catch {
    return false;
  }
}

async function uploadPublic(pathname, buffer, contentType) {
  await put(pathname, buffer, {
    ...publicPutOptions(),
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function walkFiles(dir) {
  if (!existsSync(dir)) return [];

  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walkFiles(full));
    else files.push(full);
  }
  return files;
}

function shouldMigratePathname(pathname) {
  return MEDIA_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function pathnameFromPrivateUrl(url) {
  const match = String(url).match(/private\.blob\.vercel-storage\.com\/(.+?)(?:\?|$)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function collectPrivateBlobUrlsFromText(text, bucket) {
  const matches = text.matchAll(/https?:\/\/[^\s"'<>]+private\.blob\.vercel-storage\.com[^\s"'<>]*/g);
  for (const match of matches) {
    const pathname = pathnameFromPrivateUrl(match[0]);
    if (pathname) bucket.add(pathname);
  }
}

function printResult(result) {
  const label =
    result.status === "skipped"
      ? "⊘ pulado"
      : result.status === "planned"
        ? "→ planejado"
        : "✓ feito";
  const extra = [result.size ? `${result.size} bytes` : "", result.reason || ""].filter(Boolean).join(" — ");
  console.log(`${label}  ${result.pathname}${extra ? ` — ${extra}` : ""}`);
}

async function main() {
  mergeEnv();

  console.log(APPLY ? "Modo: APLICAR migração\n" : "Modo: dry-run (use --apply para executar)\n");
  console.log(`Store privada: ${getPrivateStoreId()}`);
  console.log(`Store pública: ${getPublicStoreId()}\n`);

  if (APPLY && !getMediaToken()) {
    throw new Error(
      "Para aplicar localmente, crie BLOB_MEDIA_READ_WRITE_TOKEN no dashboard da store pública e adicione ao .env.local.",
    );
  }

  const privateOpts = privateOptions();
  const privateBlobs = await listStoreBlobs(privateOpts);
  const byPath = new Map(privateBlobs.map((blob) => [blob.pathname, blob]));
  const referenced = new Set();

  for (const blob of privateBlobs) {
    if (!blob.pathname.startsWith("cms/") && !blob.pathname.endsWith(".html")) continue;
    const downloaded = await get(blob.pathname, privateOpts);
    if (!downloaded?.stream) continue;
    const text = await new Response(downloaded.stream).text();
    collectPrivateBlobUrlsFromText(text, referenced);
  }

  const migratePathnames = new Set([
    ...privateBlobs.filter((blob) => shouldMigratePathname(blob.pathname)).map((blob) => blob.pathname),
    ...referenced,
  ]);

  let existingPublic = new Set();
  if (APPLY && getMediaToken()) {
    const publicBlobs = await listStoreBlobs({ ...publicPutOptions(), storeId: getPublicStoreId() });
    existingPublic = new Set(publicBlobs.map((blob) => blob.pathname));
  }

  console.log("=== 1) Store privada → pública ===\n");
  const copyResults = [];
  if (!migratePathnames.size) {
    console.log("Nenhum blob media/templates na store privada.\n");
  } else {
    for (const pathname of [...migratePathnames].sort()) {
      if (!APPLY) {
        const result = { pathname, status: "planned", size: byPath.get(pathname)?.size };
        copyResults.push(result);
        printResult(result);
        continue;
      }
      if (existingPublic.has(pathname)) {
        const result = { pathname, status: "skipped", reason: "já existe na store pública" };
        copyResults.push(result);
        printResult(result);
        continue;
      }
      const downloaded = await get(pathname, privateOpts);
      const buffer = Buffer.from(await new Response(downloaded.stream).arrayBuffer());
      await uploadPublic(pathname, buffer, contentTypeFromPath(pathname));
      const result = { pathname, status: "copied", size: buffer.length };
      copyResults.push(result);
      existingPublic.add(pathname);
      printResult(result);
    }
    console.log("");
  }

  console.log("=== 2) Assets locais → store pública ===\n");
  const uploadResults = [];
  for (const dir of LOCAL_ASSET_DIRS) {
    for (const filePath of walkFiles(dir)) {
      const rel = relative(join(ROOT, "assets"), filePath).replace(/\\/g, "/");
      const pathname = `media/assets/${rel}`;

      if (!APPLY) {
        const result = { pathname, status: "planned", size: statSync(filePath).size };
        uploadResults.push(result);
        printResult(result);
        continue;
      }

      if (existingPublic.has(pathname)) {
        const result = { pathname, status: "skipped", reason: "já existe na store pública" };
        uploadResults.push(result);
        printResult(result);
        continue;
      }

      const buffer = readFileSync(filePath);
      await uploadPublic(pathname, buffer, contentTypeFromPath(filePath));
      const result = { pathname, status: "uploaded", size: buffer.length };
      uploadResults.push(result);
      existingPublic.add(pathname);
      printResult(result);
    }
  }
  console.log("");

  const copied = copyResults.filter((item) => item.status === "copied").length;
  const uploaded = uploadResults.filter((item) => item.status === "uploaded").length;
  const skipped = [...copyResults, ...uploadResults].filter((item) => item.status === "skipped").length;
  const planned = [...copyResults, ...uploadResults].filter((item) => item.status === "planned").length;

  console.log("Resumo:");
  if (planned) console.log(`  ${planned} aguardando --apply`);
  if (copied) console.log(`  ${copied} copiado(s) da store privada`);
  if (uploaded) console.log(`  ${uploaded} enviado(s) do repositório`);
  if (skipped) console.log(`  ${skipped} já existente(s)`);
  if (APPLY && getMediaToken()) {
    const count = (await listStoreBlobs({ ...publicPutOptions(), storeId: getPublicStoreId() })).length;
    console.log(`  Store pública: ${count} blob(s) no total`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
