import { routeRequest } from "./lib/router.js";

function getPathSegments(req) {
  const raw = req.query?.path;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.length) return [raw];
  return [];
}

export default async function handler(req, res) {
  return routeRequest(req, res, getPathSegments(req));
}
