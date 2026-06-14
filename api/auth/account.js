import { handleCors, jsonResponse, readJsonBody } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { getAccountProfile, updateAccountProfile } from "../lib/account.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const session = requireAuth(req, res, jsonResponse);
  if (!session) return;

  try {
    if (req.method === "GET") {
      const profile = await getAccountProfile(session.user);
      return jsonResponse(res, 200, profile);
    }

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      const profile = await updateAccountProfile(session.user, {
        email: body.email,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      });
      return jsonResponse(res, 200, profile);
    }

    return jsonResponse(res, 405, { error: "Método não permitido" });
  } catch (err) {
    return jsonResponse(res, err.status || 500, { error: err.message });
  }
}
