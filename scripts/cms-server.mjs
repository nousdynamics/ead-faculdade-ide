import { createServer } from "node:http";
import { readFile, writeFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  verifyAccountLogin,
  getAccountProfile,
  updateAccountProfile,
} from "../api/lib/account.js";
import { saveUploadedImage } from "../api/lib/image-storage.js";
import { publishCoursePages } from "../api/lib/course-pages.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const CMS_DIR = join(ROOT, "data", "cms");

const CMS_USER = process.env.CMS_USER || "yeaslest";
const CMS_PASSWORD = process.env.CMS_PASSWORD || "lest1234567";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const sessions = new Map();

const COLLECTIONS = {
  courses: "courses.json",
  professors: "professors.json",
  coordination: "coordination.json",
  testimonials: "testimonials.json",
  "testimonial-templates": "testimonial-templates.json",
  areas: "areas.json",
  "formation-levels": "formation-levels.json",
  statuses: "statuses.json",
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function send(res, status, body, type = "application/json") {
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function createSession(user) {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { user, expires: Date.now() + SESSION_TTL_MS });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function requireAuth(req, res) {
  const token = getBearerToken(req);
  const session = getSession(token);
  if (!session) {
    send(res, 401, { error: "Não autorizado" });
    return null;
  }
  return session;
}

async function readBody(req) {
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  await new Promise((r) => req.on("end", r));
  return body ? JSON.parse(body) : null;
}

async function readCollection(name) {
  const file = join(CMS_DIR, COLLECTIONS[name]);
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw);
}

async function writeCollection(name, data) {
  const file = join(CMS_DIR, COLLECTIONS[name]);
  await writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  if (name === "courses") {
    const ctx = {};
    for (const key of Object.keys(COLLECTIONS)) {
      ctx[key] = key === name ? data : await readCollection(key);
    }
    publishCoursePages(data, {
      courses: data,
      professors: ctx.professors,
      coordination: ctx.coordination,
      testimonials: ctx.testimonials,
      testimonialTemplates: ctx["testimonial-templates"] || [],
      statuses: ctx.statuses,
    }).catch((err) => console.error("[course-pages]", err));

    spawn(process.execPath, [join(__dirname, "generate-sitemap.mjs")], {
      cwd: ROOT,
      stdio: "ignore",
      detached: true,
    }).unref();
  }
}

async function serveStatic(req, res) {
  let pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/") pathname = "/index.html";
  const filePath = join(ROOT, pathname.replace(/^\//, ""));
  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Not found" }));
    }
    const ext = extname(filePath);
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return send(res, 204, "");
  }

  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    try {
      const { username, password } = await readBody(req);
      const valid = await verifyAccountLogin(username, password);
      if (!valid) {
        return send(res, 401, { error: "Usuário ou senha incorretos" });
      }
      const token = createSession(username);
      return send(res, 200, { token, user: username });
    } catch (err) {
      return send(res, 400, { error: err.message });
    }
  }

  if (url.pathname === "/api/auth/account") {
    const session = requireAuth(req, res);
    if (!session) return;

    try {
      if (req.method === "GET") {
        const profile = await getAccountProfile(session.user);
        return send(res, 200, profile);
      }

      if (req.method === "PUT") {
        const body = await readBody(req);
        const profile = await updateAccountProfile(session.user, {
          email: body.email,
          currentPassword: body.currentPassword,
          newPassword: body.newPassword,
        });
        return send(res, 200, profile);
      }

      return send(res, 405, { error: "Método não permitido" });
    } catch (err) {
      return send(res, err.status || 500, { error: err.message });
    }
  }

  if (url.pathname === "/api/auth/me" && req.method === "GET") {
    const session = requireAuth(req, res);
    if (!session) return;
    try {
      const profile = await getAccountProfile(session.user);
      return send(res, 200, profile);
    } catch (err) {
      return send(res, err.status || 500, { error: err.message });
    }
  }

  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    const token = getBearerToken(req);
    if (token) sessions.delete(token);
    return send(res, 200, { ok: true });
  }

  if (url.pathname === "/api/media/upload" && req.method === "POST") {
    const session = requireAuth(req, res);
    if (!session) return;

    try {
      const body = await readBody(req);
      const result = await saveUploadedImage({
        filename: body.filename,
        data: body.data,
        contentType: body.contentType,
        folder: body.folder || "uploads",
      });
      return send(res, 201, result);
    } catch (err) {
      return send(res, err.status || 500, { error: err.message });
    }
  }

  const apiMatch = url.pathname.match(/^\/api\/cms\/([^/]+)(?:\/([^/]+))?$/);

  if (apiMatch) {
    const session = requireAuth(req, res);
    if (!session) return;

    const [, collection, id] = apiMatch;

    if (!COLLECTIONS[collection]) {
      return send(res, 404, { error: "Coleção não encontrada" });
    }

    try {
      if (req.method === "GET" && !id) {
        const data = await readCollection(collection);
        return send(res, 200, data);
      }

      if (req.method === "GET" && id) {
        const data = await readCollection(collection);
        const item = data.find((x) => x.id === id);
        if (!item) return send(res, 404, { error: "Item não encontrado" });
        return send(res, 200, item);
      }

      const payload = await readBody(req);

      if (req.method === "PUT" && !id) {
        await writeCollection(collection, payload);
        return send(res, 200, { ok: true });
      }

      if (req.method === "POST") {
        const data = await readCollection(collection);
        data.push(payload);
        await writeCollection(collection, data);
        return send(res, 201, payload);
      }

      if (req.method === "PUT" && id) {
        const data = await readCollection(collection);
        const idx = data.findIndex((x) => x.id === id);
        if (idx === -1) return send(res, 404, { error: "Item não encontrado" });
        data[idx] = { ...data[idx], ...payload, id };
        await writeCollection(collection, data);
        return send(res, 200, data[idx]);
      }

      if (req.method === "DELETE" && id) {
        const data = await readCollection(collection);
        const filtered = data.filter((x) => x.id !== id);
        if (filtered.length === data.length) return send(res, 404, { error: "Item não encontrado" });
        await writeCollection(collection, filtered);
        return send(res, 200, { ok: true });
      }

      return send(res, 405, { error: "Método não permitido" });
    } catch (err) {
      console.error(err);
      return send(res, 500, { error: err.message });
    }
  }

  if (url.pathname === "/api/cms") {
    const session = requireAuth(req, res);
    if (!session) return;

    const all = {};
    for (const key of Object.keys(COLLECTIONS)) {
      all[key] = await readCollection(key);
    }
    return send(res, 200, all);
  }

  return serveStatic(req, res);
});

const PORT = process.env.PORT || 3333;
server.listen(PORT, () => {
  console.log(`CMS server: http://localhost:${PORT}`);
  console.log(`Painel admin: http://localhost:${PORT}/admin/`);
});
