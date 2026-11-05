import { MEDIA_CACHE_CONTROL, verifyR2VideoUploadToken } from "../../lib/cloudflare/r2-media.js";

const VIDEO_MAX_BYTES = 100 * 1024 * 1024;

function jsonError(status, error) {
  return Response.json({ error }, { status });
}

/**
 * Serve um arquivo do R2 em streaming, com Range: o <video> depende de 206 para
 * avançar e o Safari nem começa a tocar sem isso.
 */
export async function serveMedia(request, env, path) {
  // Enquanto o R2 não está ativo, a mídia continua vindo do bucket antigo.
  // Cache curto de propósito: o redirect não pode ficar preso depois da troca.
  if (!env.MEDIA) {
    if (!env.MEDIA_FALLBACK_URL) return jsonError(503, "Armazenamento de mídia (R2) não ativado.");
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${env.MEDIA_FALLBACK_URL}/${path}`,
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  const object =
    request.method === "HEAD"
      ? await env.MEDIA.head(path)
      : await env.MEDIA.get(path, { range: request.headers, onlyIf: request.headers });

  if (!object) {
    // Caminhos legados que existem só como asset versionado no deploy.
    return env.ASSETS.fetch(new Request(new URL(`/${path}`, request.url), { method: request.method }));
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", MEDIA_CACHE_CONTROL);
  headers.set("Access-Control-Allow-Origin", "*");

  if (request.method === "HEAD") {
    headers.set("Content-Length", String(object.size));
    return new Response(null, { status: 200, headers });
  }

  // Sem body: a pré-condição (If-None-Match etc.) barrou a leitura.
  if (!object.body) return new Response(null, { status: 304, headers });

  if (request.headers.has("Range") && object.range) {
    const { offset = 0, length = object.size - offset } = object.range;
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    return new Response(object.body, { status: 206, headers });
  }

  return new Response(object.body, { status: 200, headers });
}

/** Recebe o vídeo do admin (PUT) e grava direto no R2, sem carregar em memória. */
export async function receiveVideoUpload(request, env) {
  const claims = verifyR2VideoUploadToken(new URL(request.url).searchParams.get("token"));
  if (!claims) return jsonError(401, "Link de envio inválido ou expirado. Tente enviar de novo.");
  if (!env.MEDIA) return jsonError(503, "Armazenamento de mídia (R2) não ativado.");

  const length = Number(request.headers.get("Content-Length"));
  if (!length) return jsonError(411, "Envio sem tamanho informado.");
  if (length > VIDEO_MAX_BYTES) return jsonError(413, "Vídeo muito grande. Máximo de 100 MB.");

  await env.MEDIA.put(claims.path, request.body, {
    httpMetadata: { contentType: claims.contentType, cacheControl: MEDIA_CACHE_CONTROL },
  });

  return Response.json({ ok: true, path: claims.path });
}
