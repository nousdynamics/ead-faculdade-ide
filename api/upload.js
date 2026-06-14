import { handleCors, jsonResponse, readJsonBody } from "./lib/http.js";
import { requireAuth } from "./lib/auth.js";
import { saveUploadedImage } from "./lib/upload.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  const session = requireAuth(req, res, jsonResponse);
  if (!session) return;

  try {
    const body = await readJsonBody(req);
    const result = await saveUploadedImage({
      filename: body.filename,
      data: body.data,
      contentType: body.contentType,
      folder: body.folder || "uploads",
    });
    return jsonResponse(res, 201, result);
  } catch (err) {
    return jsonResponse(res, err.status || 500, { error: err.message });
  }
}
