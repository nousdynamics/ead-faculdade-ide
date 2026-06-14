import { handleCors, jsonResponse } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { readAllCollections } from "../lib/cms.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  const session = requireAuth(req, res, jsonResponse);
  if (!session) return;

  try {
    const all = await readAllCollections();
    return jsonResponse(res, 200, all);
  } catch (err) {
    return jsonResponse(res, err.status || 500, { error: err.message });
  }
}
