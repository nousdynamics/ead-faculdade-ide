import { routeRequest } from "../lib/router.js";

function getPathSegments(req) {
  const raw = req.query?.path;

  if (typeof raw === "string" && raw.length) {
    return raw.split("/").filter(Boolean);
  }

  if (Array.isArray(raw)) {
    return raw.flatMap((part) => String(part).split("/")).filter(Boolean);
  }

  try {
    const url = new URL(req.url || "/", "http://localhost");
    return url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  try {
    return await routeRequest(req, res, getPathSegments(req));
  } catch (err) {
    console.error("[api/handler]", err);
    if (res.headersSent) return;
    const status = err?.status || 500;
    res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: err?.message || "Erro interno do servidor" }));
  }
}
