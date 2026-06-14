import { handleCors, jsonResponse, readJsonBody } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { COLLECTIONS, readCollection, writeCollection } from "../lib/cms.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const session = requireAuth(req, res, jsonResponse);
  if (!session) return;

  const { collection, id } = req.query;

  if (!COLLECTIONS[collection]) {
    return jsonResponse(res, 404, { error: "Coleção não encontrada" });
  }

  try {
    if (req.method === "GET") {
      const data = await readCollection(collection);
      const item = data.find((entry) => entry.id === id);
      if (!item) return jsonResponse(res, 404, { error: "Item não encontrado" });
      return jsonResponse(res, 200, item);
    }

    if (req.method === "PUT") {
      const payload = await readJsonBody(req);
      const data = await readCollection(collection);
      const idx = data.findIndex((entry) => entry.id === id);
      if (idx === -1) return jsonResponse(res, 404, { error: "Item não encontrado" });
      data[idx] = { ...data[idx], ...payload, id };
      await writeCollection(collection, data);
      return jsonResponse(res, 200, data[idx]);
    }

    if (req.method === "DELETE") {
      const data = await readCollection(collection);
      const filtered = data.filter((entry) => entry.id !== id);
      if (filtered.length === data.length) {
        return jsonResponse(res, 404, { error: "Item não encontrado" });
      }
      await writeCollection(collection, filtered);
      return jsonResponse(res, 200, { ok: true });
    }

    return jsonResponse(res, 405, { error: "Método não permitido" });
  } catch (err) {
    return jsonResponse(res, err.status || 500, { error: err.message });
  }
}
