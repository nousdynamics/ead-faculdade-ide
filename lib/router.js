import { handleCors, jsonResponse, readJsonBody } from "./http.js";
import { createToken, verifyCredentials, requireAuth } from "./auth.js";
import { getAccountProfile, updateAccountProfile } from "./account.js";
import { COLLECTIONS, readCollection, writeCollection, readAllCollections } from "./cms.js";
import { saveUploadedMedia } from "./image-storage.js";
import { handleMediaFileRequest } from "./media-files.js";
import { handleCoursePageRequest } from "./course-pages.js";
import { handleGuideLeadRequest } from "./guide-leads.js";
import { migrateBlobMedia } from "./migrate-blob-media.js";
import { handleCatalogPageRequest } from "./catalog-pages.js";
import { handleCatalogRequest } from "./catalog.js";

export async function routeRequest(req, res, segments) {
  if (handleCors(req, res)) return;

  const [a, b, c] = segments;

  try {
    if (a === "auth" && b === "login" && !c) return handleAuthLogin(req, res);
    if (a === "auth" && b === "logout" && !c) return handleAuthLogout(req, res);
    if (a === "auth" && b === "me" && !c) return handleAuthMe(req, res);
    if (a === "auth" && b === "account" && !c) return handleAuthAccount(req, res);
    if (a === "media" && b === "upload" && !c) return handleMediaUpload(req, res);
    if (a === "media" && b && req.method === "GET") {
      try {
        return await handleMediaFileRequest(req, res, segments.slice(1).join("/"));
      } catch (err) {
        return jsonResponse(res, err.status || 404, { error: err.message || "Arquivo não encontrado" });
      }
    }
    if (a === "catalog" && !b) return handleCatalogRequest(req, res);
    if (a === "catalog-page" && !c) return handleCatalogPageRequest(req, res, b || "");
    if (a === "guide-lead" && b && !c) return handleGuideLeadRequest(req, res, b);
    if (a === "migrate-blob-media" && !b) return handleMigrateBlobMedia(req, res);
    if (a === "course-page" && b && !c) return handleCoursePageRequest(req, res, b);
    if (a === "cms" && !b) return handleCmsAll(req, res);
    if (a === "cms" && b && !c) return handleCmsCollection(req, res, b);
    if (a === "cms" && b && c) return handleCmsItem(req, res, b, c);

    return jsonResponse(res, 404, { error: "Rota não encontrada" });
  } catch (err) {
    return jsonResponse(res, err.status || 500, { error: err.message });
  }
}

async function handleAuthLogin(req, res) {
  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  const { username, password } = await readJsonBody(req);
  const valid = await verifyCredentials(username, password);

  if (!valid) {
    return jsonResponse(res, 401, { error: "Usuário ou senha incorretos" });
  }

  const token = createToken(username);
  return jsonResponse(res, 200, { token, user: username });
}

function handleAuthLogout(req, res) {
  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }
  return jsonResponse(res, 200, { ok: true });
}

async function handleAuthMe(req, res) {
  if (req.method !== "GET") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  const session = requireAuth(req, res, jsonResponse);
  if (!session) return;

  const profile = await getAccountProfile(session.user);
  return jsonResponse(res, 200, profile);
}

async function handleAuthAccount(req, res) {
  const session = requireAuth(req, res, jsonResponse);
  if (!session) return;

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
}

async function handleMediaUpload(req, res) {
  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  const session = requireAuth(req, res, jsonResponse);
  if (!session) return;

  const body = await readJsonBody(req);
  const result = await saveUploadedMedia({
    filename: body.filename,
    data: body.data,
    contentType: body.contentType,
    folder: body.folder || "uploads",
  });
  return jsonResponse(res, 201, result);
}

async function handleCmsAll(req, res) {
  if (req.method !== "GET") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  const session = requireAuth(req, res, jsonResponse);
  if (!session) return;

  const all = await readAllCollections();
  return jsonResponse(res, 200, all);
}

async function handleCmsCollection(req, res, collection) {
  const session = requireAuth(req, res, jsonResponse);
  if (!session) return;

  if (!COLLECTIONS[collection]) {
    return jsonResponse(res, 404, { error: "Coleção não encontrada" });
  }

  if (req.method === "GET") {
    const data = await readCollection(collection);
    return jsonResponse(res, 200, data);
  }

  if (req.method === "PUT") {
    const payload = await readJsonBody(req);
    if (payload === undefined || payload === null) {
      return jsonResponse(res, 400, { error: "Corpo da requisição inválido" });
    }
    const pages = await writeCollection(collection, payload);
    return jsonResponse(res, 200, { ok: true, pages: pages || undefined });
  }

  if (req.method === "POST") {
    const payload = await readJsonBody(req);
    const data = await readCollection(collection);
    data.push(payload);
    const pages = await writeCollection(collection, data);
    return jsonResponse(res, 201, { item: payload, pages: pages || undefined });
  }

  return jsonResponse(res, 405, { error: "Método não permitido" });
}

async function handleCmsItem(req, res, collection, id) {
  const session = requireAuth(req, res, jsonResponse);
  if (!session) return;

  if (!COLLECTIONS[collection]) {
    return jsonResponse(res, 404, { error: "Coleção não encontrada" });
  }

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
    const pages = await writeCollection(collection, data);
    return jsonResponse(res, 200, { item: data[idx], pages: pages || undefined });
  }

  if (req.method === "DELETE") {
    const data = await readCollection(collection);
    const filtered = data.filter((entry) => entry.id !== id);
    if (filtered.length === data.length) {
      return jsonResponse(res, 404, { error: "Item não encontrado" });
    }
    const pages = await writeCollection(collection, filtered);
    return jsonResponse(res, 200, { ok: true, pages: pages || undefined });
  }

  return jsonResponse(res, 405, { error: "Método não permitido" });
}

async function handleMigrateBlobMedia(req, res) {
  const session = requireAuth(req, res, jsonResponse);
  if (!session) return;

  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  const body = await readJsonBody(req).catch(() => ({}));
  const dryRun = body?.dryRun === true;
  const report = await migrateBlobMedia({ apply: !dryRun });
  return jsonResponse(res, 200, report);
}
