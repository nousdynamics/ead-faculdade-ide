import { put } from "@vercel/blob";

export const STORAGE_ERROR =
  "Armazenamento não configurado. Conecte o Blob ao projeto (Storage → ead-faculdade-ide-blob → gru1) e confira BLOB_STORE_ID.";

export const MEDIA_STORAGE_ERROR =
  "Blob de mídia não configurado. Conecte ead-faculdade-ide-blob-public ao projeto e confira BLOB_MEDIA_STORE_ID.";

export function getPrivateBlobStoreId() {
  return process.env.BLOB_STORE_ID?.trim() || "";
}

/** Store pública para imagens/PDFs (ead-faculdade-ide-blob-public). */
export function getMediaBlobStoreId() {
  return (
    process.env.BLOB_MEDIA_STORE_ID?.trim().replace(/^"|"$/g, "") ||
    process.env.OFC_STORE_ID?.trim().replace(/^"|"$/g, "") ||
    ""
  );
}

function canUseBlobRuntime() {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return true;
  if (process.env.VERCEL) return true;
  if (process.env.VERCEL_OIDC_TOKEN?.trim()) return true;
  return false;
}

/** Blob privado (CMS, páginas, conta). */
export function hasBlobStorage() {
  if (!getPrivateBlobStoreId()) return false;
  return canUseBlobRuntime();
}

/** Blob público de mídia. */
export function hasMediaBlobStorage() {
  if (!getMediaBlobStoreId()) return false;
  return canUseBlobRuntime();
}

export function getBlobStorageMode() {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return "token";
  if (getPrivateBlobStoreId() && canUseBlobRuntime()) return "oidc";
  return null;
}

function assertBlobStorage() {
  if (hasBlobStorage()) return;
  throw Object.assign(new Error(STORAGE_ERROR), { status: 503 });
}

function assertMediaBlobStorage() {
  if (hasMediaBlobStorage()) return;
  throw Object.assign(new Error(MEDIA_STORAGE_ERROR), { status: 503 });
}

/** Opções para @vercel/blob. No runtime Vercel usa OIDC; local usa token RW ou CLI. */
export function getBlobClientOptions(storeId = getPrivateBlobStoreId()) {
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();

  if (process.env.VERCEL && storeId) {
    return oidcToken ? { storeId, oidcToken } : { storeId };
  }

  if (token) return { token };

  if (storeId && oidcToken) return { storeId, oidcToken };

  return storeId ? { storeId } : {};
}

export function getCanonicalBlobStoreId() {
  return getPrivateBlobStoreId();
}

/**
 * Grava JSON ou binário no Vercel Blob privado (OIDC ou BLOB_READ_WRITE_TOKEN).
 */
export async function writeBlob(pathname, body, contentType = "application/json; charset=utf-8") {
  return putBlob(pathname, body, contentType, "private", getPrivateBlobStoreId());
}

/** Mídia pública (imagens/PDFs) na store ead-faculdade-ide-blob-public. */
export async function writeMediaBlob(pathname, body, contentType) {
  return putBlob(pathname, body, contentType, "public", getMediaBlobStoreId());
}

async function putBlob(pathname, body, contentType, access, storeId) {
  if (access === "public") {
    assertMediaBlobStorage();
  } else {
    assertBlobStorage();
  }

  let payload;
  if (Buffer.isBuffer(body)) {
    payload = body;
  } else if (typeof body === "string") {
    payload = body;
  } else {
    payload = JSON.stringify(body, null, 2) + "\n";
  }

  if (!payload || (typeof payload === "string" && !payload.trim())) {
    throw Object.assign(new Error("Dados inválidos para salvar"), { status: 400 });
  }

  try {
    return await put(pathname, payload, {
      access,
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      ...getBlobClientOptions(storeId),
    });
  } catch (err) {
    const message = err?.message || "Falha ao salvar no Blob";
    const status =
      err?.name === "BlobStoreNotFoundError" || /token|auth|unauthorized/i.test(message)
        ? 503
        : 502;
    throw Object.assign(new Error(message), { status });
  }
}
