import { routeRequest } from "./lib/router.js";

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
  return routeRequest(req, res, getPathSegments(req));
}
