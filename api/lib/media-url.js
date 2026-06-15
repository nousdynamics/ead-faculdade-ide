const MEDIA_PREFIXES = ["assets/img/", "assets/docs/"];

export function isMediaPath(path) {
  const normalized = String(path || "").replace(/^\//, "");
  return MEDIA_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function sanitizeMediaPath(raw) {
  const normalized = String(raw || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return null;
  if (!isMediaPath(normalized)) return null;
  return normalized;
}

/** URL pública estável servida pela API (funciona no admin e nas páginas de curso). */
export function toMediaUrl(path, { absolute = false } = {}) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const normalized = sanitizeMediaPath(path);
  if (!normalized) return String(path).replace(/^\//, "") ? `/${String(path).replace(/^\//, "")}` : "";

  const url = `/api/media/${normalized}`;
  if (absolute) {
    const origin = process.env.SITE_ORIGIN || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "";
    return origin ? `${origin}${url}` : url;
  }
  return url;
}
