import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { get, list } from "@vercel/blob";
import {
  hasBlobStorage,
  hasMediaBlobStorage,
  getBlobClientOptions,
  getMediaBlobStoreId,
  getPrivateBlobStoreId,
} from "./blob-storage.js";
import { getMediaStorageProvider } from "./storage-provider.js";
import { downloadSupabaseMedia, getSupabaseMediaRedirect } from "./supabase/media-storage.js";
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

async function readFromStore(relativePath, { storeId, access }) {
  const pathname = `media/${relativePath}`;
  const options = { access, ...getBlobClientOptions(storeId) };

  if (access === "public") {
    const { blobs } = await list({ prefix: pathname, limit: 10, ...options });
    const match = blobs.find((blob) => blob.pathname === pathname);
    if (!match?.url) return null;

    return {
      redirect: match.url,
      contentType: match.contentType || contentTypeFromPath(relativePath),
    };
  }

  const result = await get(pathname, options);
  if (result?.statusCode !== 200 || !result.stream) return null;

  const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
  return {
    buffer,
    contentType: result.blob.contentType || contentTypeFromPath(relativePath),
  };
}

async function readSupabaseMedia(relativePath) {
  if (getMediaStorageProvider() !== "supabase") return null;

  const downloaded = await downloadSupabaseMedia(relativePath);
  if (downloaded?.buffer) {
    return {
      buffer: downloaded.buffer,
      contentType: contentTypeFromPath(relativePath),
    };
  }

  return {
    redirect: getSupabaseMediaRedirect(relativePath),
    contentType: contentTypeFromPath(relativePath),
  };
}

async function readBlobMedia(relativePath) {
  if (hasMediaBlobStorage()) {
    const fromPublic = await readFromStore(relativePath, {
      storeId: getMediaBlobStoreId(),
      access: "public",
    });
    if (fromPublic) return fromPublic;
  }

  if (hasBlobStorage()) {
    try {
      return await readFromStore(relativePath, {
        storeId: getPrivateBlobStoreId(),
        access: "private",
      });
    } catch {
      /* legado na store privada */
    }
  }

  return null;
}

export async function resolveMediaFile(relativePath) {
  const safePath = sanitizeMediaPath(relativePath);
  if (!safePath) {
    throw Object.assign(new Error("Arquivo não encontrado"), { status: 404 });
  }

  try {
    return await readLocalMedia(safePath);
  } catch {
    /* tenta storage remoto em produção */
  }

  const fromSupabase = await readSupabaseMedia(safePath);
  if (fromSupabase) return fromSupabase;

  const fromBlob = await readBlobMedia(safePath);
  if (fromBlob) return fromBlob;

  // Assets versionados no deploy (caminhos legados fora das pastas de upload do CMS)
  return {
    redirect: `/${safePath}`,
    contentType: contentTypeFromPath(safePath),
  };
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
