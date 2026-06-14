const BLOB_API = process.env.VERCEL_BLOB_API_URL || "https://blob.vercel-storage.com";
const BLOB_API_VERSION = process.env.VERCEL_BLOB_API_VERSION_OVERRIDE || "9";

export function getBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw Object.assign(
      new Error(
        "Armazenamento não configurado. No painel Vercel: Storage → Blob → Connect to Project e faça redeploy.",
      ),
      { status: 503 },
    );
  }
  return token;
}

function blobRequestId(token) {
  const storeId = token.split("_")[3] || "cms";
  return `${storeId}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

/**
 * Grava JSON ou binário no Vercel Blob via fetch nativo (evita crash do SDK em alguns runtimes).
 */
export async function writeBlob(pathname, body, contentType = "application/json; charset=utf-8") {
  const token = getBlobToken();

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

  const byteLength = Buffer.isBuffer(payload)
    ? payload.byteLength
    : Buffer.byteLength(payload, "utf8");

  const url = `${BLOB_API}/?${new URLSearchParams({ pathname })}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "x-api-version": BLOB_API_VERSION,
      "x-api-blob-request-id": blobRequestId(token),
      "x-api-blob-request-attempt": "0",
      "x-content-type": contentType,
      "x-add-random-suffix": "0",
      "x-content-length": String(byteLength),
    },
    body: payload,
  });

  if (!res.ok) {
    let message = `Falha ao salvar no Blob (HTTP ${res.status})`;
    try {
      const data = await res.json();
      message = data?.error?.message || data?.message || message;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) message = text.slice(0, 300);
    }

    const status = res.status === 401 || res.status === 403 ? 503 : res.status >= 500 ? 502 : 400;
    throw Object.assign(new Error(message), { status });
  }

  return res.json().catch(() => ({}));
}
