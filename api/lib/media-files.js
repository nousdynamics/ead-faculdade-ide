import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { list } from "@vercel/blob";
import { hasBlobStorage, getBlobClientOptions } from "./blob-storage.js";
import { sanitizeMediaPath } from "./media-url.js";

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

function contentTypeFromPath(path) {
  return MIME_BY_EXT[extname(path).toLowerCase()] || "application/octet-stream";
}

async function readLocalMedia(relativePath) {
  const buffer = await readFile(join(process.cwd(), relativePath));
  return {
    buffer,
    contentType: contentTypeFromPath(relativePath),
  };
}

async function readBlobMedia(relativePath) {
  const pathname = `media/${relativePath}`;
  const { blobs } = await list({ prefix: pathname, limit: 10, ...getBlobClientOptions() });
  const match = blobs.find((blob) => blob.pathname === pathname);
  if (!match?.url) return null;

  if (/\.public\.blob\.vercel-storage\.com/i.test(match.url)) {
    return { redirect: match.url, contentType: match.contentType || contentTypeFromPath(relativePath) };
  }

  const headers = process.env.BLOB_READ_WRITE_TOKEN
    ? { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
    : undefined;
  const res = await fetch(match.url, headers ? { headers } : undefined);
  if (!res.ok) return null;

  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    contentType: match.contentType || res.headers.get("content-type") || contentTypeFromPath(relativePath),
  };
}

export async function resolveMediaFile(relativePath) {
  const safePath = sanitizeMediaPath(relativePath);
  if (!safePath) {
    throw Object.assign(new Error("Arquivo não encontrado"), { status: 404 });
  }

  try {
    return await readLocalMedia(safePath);
  } catch {
    /* tenta Blob em produção */
  }

  if (hasBlobStorage()) {
    const fromBlob = await readBlobMedia(safePath);
    if (fromBlob) return fromBlob;
  }

  throw Object.assign(new Error("Arquivo não encontrado"), { status: 404 });
}

export async function handleMediaFileRequest(_req, res, relativePath) {
  const file = await resolveMediaFile(relativePath);
  const cacheControl = "public, max-age=31536000, immutable";

  if (file.redirect) {
    res.status(302);
    res.setHeader("Location", file.redirect);
    res.setHeader("Cache-Control", cacheControl);
    res.end();
    return;
  }

  res.status(200);
  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Cache-Control", cacheControl);
  res.end(file.buffer);
}
