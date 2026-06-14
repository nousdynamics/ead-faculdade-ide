import { handleCors, jsonResponse } from "../lib/http.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  // JWT stateless — logout é apenas no cliente.
  return jsonResponse(res, 200, { ok: true });
}
