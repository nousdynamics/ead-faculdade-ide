import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { get, list } from "@vercel/blob";
import {
  getPrivateBlobStoreId,
  getMediaBlobStoreId,
  getBlobClientOptions,
  writeMediaBlob,
  hasBlobStorage,
  hasMediaBlobStorage,
} from "./blob-storage.js";

const MEDIA_PREFIXES = ["media/", "templates/"];

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

function contentTypeFromPath(path) {
  return MIME_BY_EXT[extname(path).toLowerCase()] || "application/octet-stream";
}

function privateOptions() {
  return { storeId: getPrivateBlobStoreId(), access: "private", ...getBlobClientOptions(getPrivateBlobStoreId()) };
}

function publicOptions() {
  return { storeId: getMediaBlobStoreId(), ...getBlobClientOptions(getMediaBlobStoreId()) };
}

function shouldMigratePathname(pathname) {
  return MEDIA_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function pathnameFromPrivateUrl(url) {
  const match = String(url).match(/private\.blob\.vercel-storage\.com\/(.+?)(?:\?|$)/);
  return match ? decodeURIComponent(match[1]) : null;
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

function walkFiles(dir) {
  if (!existsSync(dir)) return [];

  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walkFiles(full));
    else files.push(full);
  }
  return files;
}

function collectPrivateBlobUrlsFromText(text, bucket) {
  const matches = text.matchAll(/https?:\/\/[^\s"'<>]+private\.blob\.vercel-storage\.com[^\s"'<>]*/g);
  for (const match of matches) {
    const pathname = pathnameFromPrivateUrl(match[0]);
    if (pathname) bucket.add(pathname);
  }
}

async function copyPrivateToPublic(pathname, existingPublic) {
  if (existingPublic.has(pathname)) {
    return { pathname, status: "skipped", reason: "já existe na store pública" };
  }

  const downloaded = await get(pathname, privateOptions());
  if (!downloaded?.stream) {
    return { pathname, status: "error", reason: "não encontrado na store privada" };
  }

  const buffer = Buffer.from(await new Response(downloaded.stream).arrayBuffer());
  await writeMediaBlob(pathname, buffer, contentTypeFromPath(pathname));
  return { pathname, status: "copied", size: buffer.length };
}

async function uploadLocalAsset(filePath, root, existingPublic) {
  const rel = relative(join(root, "assets"), filePath).replace(/\\/g, "/");
  const pathname = `media/assets/${rel}`;

  if (existingPublic.has(pathname)) {
    return { pathname, status: "skipped", reason: "já existe na store pública" };
  }

  const buffer = readFileSync(filePath);
  await writeMediaBlob(pathname, buffer, contentTypeFromPath(filePath));
  return { pathname, status: "uploaded", size: buffer.length };
}

export async function migrateBlobMedia({ apply = true } = {}) {
  if (!hasBlobStorage() || !hasMediaBlobStorage()) {
    throw Object.assign(new Error("Blob privado ou público não configurado."), { status: 503 });
  }

  const root = process.cwd();
  const publicBlobs = await listStoreBlobs(publicOptions());
  const existingPublic = new Set(publicBlobs.map((blob) => blob.pathname));

  const privateBlobs = await listStoreBlobs(privateOptions());
  const byPath = new Map(privateBlobs.map((blob) => [blob.pathname, blob]));
  const referenced = new Set();

  for (const blob of privateBlobs) {
    if (!blob.pathname.startsWith("cms/") && !blob.pathname.endsWith(".html")) continue;
    const downloaded = await get(blob.pathname, privateOptions());
    if (!downloaded?.stream) continue;
    const text = await new Response(downloaded.stream).text();
    collectPrivateBlobUrlsFromText(text, referenced);
  }

  const migratePathnames = new Set([
    ...privateBlobs.filter((blob) => shouldMigratePathname(blob.pathname)).map((blob) => blob.pathname),
    ...referenced,
  ]);

  const results = { copied: [], uploaded: [], skipped: [], errors: [] };

  if (apply) {
    for (const pathname of [...migratePathnames].sort()) {
      try {
        const result = await copyPrivateToPublic(pathname, existingPublic);
        if (result.status === "skipped") results.skipped.push(result);
        else if (result.status === "error") results.errors.push(result);
        else results.copied.push(result);
        if (result.status === "copied") existingPublic.add(pathname);
      } catch (err) {
        results.errors.push({ pathname, status: "error", reason: err.message });
      }
    }

    for (const dir of [join(root, "assets", "img"), join(root, "assets", "docs")]) {
      for (const filePath of walkFiles(dir)) {
        try {
          const result = await uploadLocalAsset(filePath, root, existingPublic);
          if (result.status === "skipped") results.skipped.push(result);
          else results.uploaded.push(result);
          if (result.status === "uploaded") existingPublic.add(result.pathname);
        } catch (err) {
          results.errors.push({ pathname: filePath, status: "error", reason: err.message });
        }
      }
    }
  }

  const publicAfter = apply ? await listStoreBlobs(publicOptions()) : publicBlobs;

  return {
    apply,
    privateStoreId: getPrivateBlobStoreId(),
    publicStoreId: getMediaBlobStoreId(),
    plannedPrivate: [...migratePathnames],
    localAssets: walkFiles(join(root, "assets", "img")).length + walkFiles(join(root, "assets", "docs")).length,
    results,
    publicBlobCount: publicAfter.length,
  };
}
