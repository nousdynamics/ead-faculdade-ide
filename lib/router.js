import { handleCors, jsonResponse, readJsonBody } from "./http.js";
import { createToken, requireAuth } from "./auth.js";
import {
  verifyUserLogin,
  getAccountProfile,
  updateAccountProfile,
  isRegistrationAvailable,
  registerCmsAccount,
  canManageUsers,
} from "./account.js";
import { COLLECTIONS, readCollection, writeCollection, readAllCollections } from "./cms.js";
import { saveUploadedMedia, createSignedVideoUpload } from "./image-storage.js";
import { handleMediaFileRequest } from "./media-files.js";
import { handleCoursePageRequest } from "./course-pages.js";
import { handleGuideLeadRequest } from "./guide-leads.js";
import { migrateBlobMedia } from "./migrate-blob-media.js";
import { handleCatalogPageRequest } from "./catalog-pages.js";
import { handleCatalogRequest } from "./catalog.js";
import {
  listSiteUsers,
  updateSiteUserAccessLevel,
} from "./site-users-admin.js";

export async function routeRequest(req, res, segments) {
  if (handleCors(req, res)) return;

  const [a, b, c] = segments;

  try {
    if (a === "auth" && b === "login" && !c) return handleAuthLogin(req, res);
    if (a === "auth" && b === "register-status" && !c) return handleAuthRegisterStatus(req, res);
    if (a === "auth" && b === "register" && !c) return handleAuthRegister(req, res);
    if (a === "auth" && b === "logout" && !c) return handleAuthLogout(req, res);
    if (a === "auth" && b === "me" && !c) return handleAuthMe(req, res);
    if (a === "auth" && b === "account" && !c) return handleAuthAccount(req, res);
    if (a === "auth" && b === "site-users" && !c) return handleAuthSiteUsers(req, res);
    if (a === "media" && b === "upload" && !c) return handleMediaUpload(req, res);
    if (a === "media" && b === "signed-upload" && !c) return handleMediaSignedUpload(req, res);
    if (a === "media" && b === "videos" && !c) return handleMediaVideos(req, res);
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
  const user = await verifyUserLogin(username, password);

  if (!user) {
    return jsonResponse(res, 401, { error: "Usuário ou senha incorretos" });
  }

  const profile = await getAccountProfile(user.email);
  const token = createToken(user.email);
  return jsonResponse(res, 200, { token, ...profile });
}

async function handleAuthRegisterStatus(req, res) {
  if (req.method !== "GET") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  const available = await isRegistrationAvailable();
  return jsonResponse(res, 200, { available });
}

async function handleAuthRegister(req, res) {
  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  const { email, password } = await readJsonBody(req);
  const profile = await registerCmsAccount({ email, password });
  const token = createToken(profile.user);
  return jsonResponse(res, 201, { token, ...profile });
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

async function requireWriteSession(req, res) {
  const session = requireAuth(req, res, jsonResponse);
  if (!session) return null;

  const profile = await getAccountProfile(session.user);
  if (!profile.canWrite) {
    jsonResponse(res, 403, { error: "Seu acesso é somente leitura." });
    return null;
  }

  return { session, profile };
}

async function requireCmsSuperAdmin(req, res) {
  const session = requireAuth(req, res, jsonResponse);
  if (!session) return null;

  const profile = await getAccountProfile(session.user);
  if (!canManageUsers(profile.accessLevel)) {
    jsonResponse(res, 403, { error: "Acesso restrito ao super admin" });
    return null;
  }

  return { session, profile };
}

async function handleAuthSiteUsers(req, res) {
  const admin = await requireCmsSuperAdmin(req, res);
  if (!admin) return;

  if (req.method === "GET") {
    const users = await listSiteUsers();
    return jsonResponse(res, 200, { users });
  }

  if (req.method === "PUT") {
    const body = await readJsonBody(req);
    const user = await updateSiteUserAccessLevel(body.userId, body.accessLevel);
    return jsonResponse(res, 200, { user });
  }

  return jsonResponse(res, 405, { error: "Método não permitido" });
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

  const auth = await requireWriteSession(req, res);
  if (!auth) return;

  const body = await readJsonBody(req);
  const result = await saveUploadedMedia({
    filename: body.filename,
    data: body.data,
    contentType: body.contentType,
    folder: body.folder || "uploads",
  });
  return jsonResponse(res, 201, result);
}

async function handleMediaSignedUpload(req, res) {
  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  const auth = await requireWriteSession(req, res);
  if (!auth) return;

  const body = await readJsonBody(req);
  const result = await createSignedVideoUpload({
    filename: body?.filename,
    contentType: body?.contentType,
    folder: body?.folder || "testimonials",
  });
  return jsonResponse(res, 201, result);
}

async function handleMediaVideos(req, res) {
  if (req.method === "GET") {
    const session = requireAuth(req, res, jsonResponse);
    if (!session) return;
    const { listSupabaseVideos } = await import("./supabase/media-storage.js");
    const videos = await listSupabaseVideos();
    return jsonResponse(res, 200, { videos });
  }

  if (req.method === "DELETE") {
    const auth = await requireWriteSession(req, res);
    if (!auth) return;
    const body = await readJsonBody(req);
    const { deleteSupabaseVideo } = await import("./supabase/media-storage.js");
    const result = await deleteSupabaseVideo(body?.path);
    return jsonResponse(res, 200, result);
  }

  return jsonResponse(res, 405, { error: "Método não permitido" });
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
  if (!COLLECTIONS[collection]) {
    return jsonResponse(res, 404, { error: "Coleção não encontrada" });
  }

  if (req.method === "GET") {
    const session = requireAuth(req, res, jsonResponse);
    if (!session) return;
    const data = await readCollection(collection);
    return jsonResponse(res, 200, data);
  }

  const auth = await requireWriteSession(req, res);
  if (!auth) return;

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
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return jsonResponse(res, 400, { error: "Corpo da requisição inválido" });
    }
    if (typeof payload.id !== "string" || !payload.id.trim()) {
      return jsonResponse(res, 400, { error: "Item precisa de um campo 'id' não vazio" });
    }
    const data = await readCollection(collection);
    if (data.some((entry) => entry?.id === payload.id)) {
      return jsonResponse(res, 409, { error: "Já existe um item com este id na coleção" });
    }
    data.push(payload);
    const pages = await writeCollection(collection, data);
    return jsonResponse(res, 201, { item: payload, pages: pages || undefined });
  }

  return jsonResponse(res, 405, { error: "Método não permitido" });
}

async function handleCmsItem(req, res, collection, id) {
  if (!COLLECTIONS[collection]) {
    return jsonResponse(res, 404, { error: "Coleção não encontrada" });
  }

  if (req.method === "GET") {
    const session = requireAuth(req, res, jsonResponse);
    if (!session) return;
    const data = await readCollection(collection);
    const item = data.find((entry) => entry.id === id);
    if (!item) return jsonResponse(res, 404, { error: "Item não encontrado" });
    return jsonResponse(res, 200, item);
  }

  const auth = await requireWriteSession(req, res);
  if (!auth) return;

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
  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  const auth = await requireWriteSession(req, res);
  if (!auth) return;

  const body = await readJsonBody(req).catch(() => ({}));
  const dryRun = body?.dryRun === true;
  const report = await migrateBlobMedia({ apply: !dryRun });
  return jsonResponse(res, 200, report);
}
