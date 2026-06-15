const MEDIA_PREFIXES = ["assets/img/", "assets/docs/"];

export function isMediaPath(path) {
  const normalized = String(path || "").replace(/^\//, "");
  return MEDIA_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/** Arquivos enviados pelo painel (Blob público), não assets estáticos do repositório. */
export function isCmsUploadedMedia(path) {
  const normalized = String(path || "").replace(/^\//, "");
  return /^assets\/(img|docs)\/(courses|coordination|professors|testimonials|uploads)\//.test(normalized);
}

export function sanitizeMediaPath(raw) {
  const normalized = String(raw || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return null;
  if (!isMediaPath(normalized)) return null;
  return normalized;
}

/** URL pública estável servida pela API (funciona no admin e nas páginas de curso). */
export function resolveSiteOrigin() {
  const siteOrigin = process.env.SITE_ORIGIN?.trim();
  if (siteOrigin) return siteOrigin.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, "")}`;

  return "";
}

export function toMediaUrl(path, { absolute = false } = {}) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const normalized = sanitizeMediaPath(path);
  if (!normalized) return String(path).replace(/^\//, "") ? `/${String(path).replace(/^\//, "")}` : "";

  const url = `/api/media/${normalized}`;
  if (absolute) {
    const origin = resolveSiteOrigin();
    return origin ? `${origin}${url}` : url;
  }
  return url;
}

/** URL para exibir mídia: uploads do CMS via API; assets estáticos via caminho relativo/absoluto. */
export function resolveAssetUrl(path, { base = "", absolute = false } = {}) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const normalized = String(path).replace(/^\//, "");
  if (isCmsUploadedMedia(normalized)) return toMediaUrl(normalized, { absolute });

  if (absolute) {
    const origin = resolveSiteOrigin();
    return origin ? `${origin}/${normalized}` : `/${normalized}`;
  }

  return base ? `${base}${normalized}` : `/${normalized}`;
}
