import { put } from "@vercel/blob";

const STORAGE_ERROR =
  "Armazenamento não configurado. No painel Vercel: Storage → ead-faculdade-ide-blob → Projects → conecte ao projeto e faça redeploy.";

/** Blob disponível via token estático ou OIDC (conexão moderna da Vercel). */
export function hasBlobStorage() {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return true;
  if (process.env.BLOB_STORE_ID?.trim() && process.env.VERCEL_OIDC_TOKEN?.trim()) return true;
  return false;
}

export function getBlobStorageMode() {
  if (process.env.BLOB_STORE_ID?.trim() && process.env.VERCEL_OIDC_TOKEN?.trim()) return "oidc";
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return "token";
  return null;
}

function assertBlobStorage() {
  if (hasBlobStorage()) return;
  throw Object.assign(new Error(STORAGE_ERROR), { status: 503 });
}

/**
 * Grava JSON ou binário no Vercel Blob (OIDC ou BLOB_READ_WRITE_TOKEN).
 */
export async function writeBlob(pathname, body, contentType = "application/json; charset=utf-8") {
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
      access: "private",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
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
