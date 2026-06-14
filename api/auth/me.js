import { handleCors, jsonResponse } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { getAccountProfile } from "../lib/account.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  const session = requireAuth(req, res, jsonResponse);
  if (!session) return;

  try {
    const profile = await getAccountProfile(session.user);
    return jsonResponse(res, 200, profile);
  } catch (err) {
    return jsonResponse(res, err.status || 500, { error: err.message });
  }
}
