import { handleCors, jsonResponse, readJsonBody } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { COLLECTIONS, readCollection, writeCollection } from "../lib/cms.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const session = requireAuth(req, res, jsonResponse);
  if (!session) return;

  const { collection } = req.query;

  if (!COLLECTIONS[collection]) {
    return jsonResponse(res, 404, { error: "Coleção não encontrada" });
  }

  try {
    if (req.method === "GET") {
      const data = await readCollection(collection);
      return jsonResponse(res, 200, data);
    }

    if (req.method === "PUT") {
      const payload = await readJsonBody(req);
      await writeCollection(collection, payload);
      return jsonResponse(res, 200, { ok: true });
    }

    if (req.method === "POST") {
      const payload = await readJsonBody(req);
      const data = await readCollection(collection);
      data.push(payload);
      await writeCollection(collection, data);
      return jsonResponse(res, 201, payload);
    }

    return jsonResponse(res, 405, { error: "Método não permitido" });
  } catch (err) {
    return jsonResponse(res, err.status || 500, { error: err.message });
  }
}
