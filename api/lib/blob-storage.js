import { put } from "@vercel/blob";

export const STORAGE_ERROR =
  "Armazenamento não configurado. Conecte o Blob ao projeto (Storage → ead-faculdade-ide-blob → gru1) e confira BLOB_STORE_ID.";

/** Blob disponível via token estático ou OIDC (conexão moderna da Vercel). */
export function hasBlobStorage() {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return true;
  if (!process.env.BLOB_STORE_ID?.trim()) return false;
  // No runtime Vercel o OIDC vem do header x-vercel-oidc-token por requisição,
  // não necessariamente de process.env.VERCEL_OIDC_TOKEN.
  if (process.env.VERCEL) return true;
  if (process.env.VERCEL_OIDC_TOKEN?.trim()) return true;
  return false;
}

export function getBlobStorageMode() {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return "token";
  if (process.env.BLOB_STORE_ID?.trim() && (process.env.VERCEL || process.env.VERCEL_OIDC_TOKEN?.trim())) {
    return "oidc";
  }
  return null;
}

function assertBlobStorage() {
  if (hasBlobStorage()) return;
  throw Object.assign(new Error(STORAGE_ERROR), { status: 503 });
}

/** Opções compartilhadas para @vercel/blob. No runtime Vercel usa OIDC; local usa token RW ou CLI. */
export function getBlobClientOptions() {
  const storeId = process.env.BLOB_STORE_ID?.trim();
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
  return process.env.BLOB_STORE_ID?.trim() || "";
}

/**
 * Grava JSON ou binário no Vercel Blob (OIDC ou BLOB_READ_WRITE_TOKEN).
 */
export async function writeBlob(pathname, body, contentType = "application/json; charset=utf-8") {
  return putBlob(pathname, body, contentType, "private");
}

/** Mídia pública (imagens/PDFs) — acessível via URL pública do Blob ou proxy /api/media. */
export async function writePublicBlob(pathname, body, contentType) {
  return putBlob(pathname, body, contentType, "public");
}

async function putBlob(pathname, body, contentType, access) {
  assertBlobStorage();

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
      ...getBlobClientOptions(),
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
