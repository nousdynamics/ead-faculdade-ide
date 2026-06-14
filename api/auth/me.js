import { handleCors, jsonResponse } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  const session = requireAuth(req, res, jsonResponse);
  if (!session) return;

  return jsonResponse(res, 200, { user: session.user });
}
