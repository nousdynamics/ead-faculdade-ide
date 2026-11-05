import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "../auth.js";
import { toMediaUrl } from "../media-url.js";
import { getMediaBucket } from "./bindings.js";

export const MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";

const VIDEO_PREFIX = "assets/video/";
const UPLOAD_TOKEN_TTL_MS = 30 * 60 * 1000;

export async function uploadR2Media(objectPath, buffer, contentType) {
  await getMediaBucket().put(objectPath, buffer, {
    httpMetadata: { contentType, cacheControl: MEDIA_CACHE_CONTROL },
  });
}

/** Mesmo formato de listSupabaseVideos, usado pela aba Vídeos do admin. */
export async function listR2Videos() {
  const bucket = getMediaBucket();
  const objects = [];
  let cursor;

  do {
    const page = await bucket.list({ prefix: VIDEO_PREFIX, cursor, include: ["httpMetadata"] });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return objects
    .map((object) => {
      const parts = object.key.slice(VIDEO_PREFIX.length).split("/");
      return {
        name: parts.at(-1),
        folder: parts.length > 1 ? parts[0] : "—",
        path: object.key,
        publicUrl: toMediaUrl(object.key),
        size: object.size,
        contentType: object.httpMetadata?.contentType || "",
        updatedAt: object.uploaded.toISOString(),
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteR2Video(objectPath) {
  const path = String(objectPath || "").replace(/^\/+/, "");
  if (!path.startsWith(VIDEO_PREFIX) || path.includes("..")) {
    throw Object.assign(new Error("Caminho inválido: só é possível excluir vídeos"), { status: 400 });
  }
  await getMediaBucket().delete(path);
  return { ok: true, path };
}

function signUploadClaims(encodedClaims) {
  return createHmac("sha256", getSessionSecret()).update(`video-upload:${encodedClaims}`).digest("base64url");
}

/**
 * URL de upload de vídeo na própria origem. O corpo vai em streaming para o R2
 * (ver worker/media.js), então o admin não precisa de credenciais nem de CORS.
 */
export function createR2VideoUpload(objectPath, contentType) {
  getMediaBucket(); // sem R2 ativo, falha aqui e não depois do envio

  const claims = { path: objectPath, contentType, exp: Date.now() + UPLOAD_TOKEN_TTL_MS };
  const encoded = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const token = `${encoded}.${signUploadClaims(encoded)}`;

  return {
    path: objectPath,
    signedUrl: `/api/media/direct-upload?token=${token}`,
    token,
    publicUrl: toMediaUrl(objectPath),
  };
}

/** Devolve { path, contentType } se o token é válido e não expirou; senão null. */
export function verifyR2VideoUploadToken(token) {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) return null;

  const expected = Buffer.from(signUploadClaims(encoded));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  const claims = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  return claims.exp >= Date.now() ? claims : null;
}
