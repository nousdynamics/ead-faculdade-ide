import { handleCors, jsonResponse, readJsonBody } from "../lib/http.js";
import { createToken, verifyCredentials } from "../lib/auth.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  try {
    const { username, password } = await readJsonBody(req);

    if (!verifyCredentials(username, password)) {
      return jsonResponse(res, 401, { error: "Usuário ou senha incorretos" });
    }

    const token = createToken(username);
    return jsonResponse(res, 200, { token, user: username });
  } catch (err) {
    return jsonResponse(res, 400, { error: err.message || "Requisição inválida" });
  }
}
