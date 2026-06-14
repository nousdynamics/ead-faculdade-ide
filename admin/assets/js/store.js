const COLLECTIONS = [
  "courses",
  "professors",
  "coordination",
  "testimonials",
  "testimonial-templates",
  "areas",
  "formation-levels",
  "statuses",
];

const FILE_MAP = {
  courses: "/data/cms/courses.json",
  professors: "/data/cms/professors.json",
  coordination: "/data/cms/coordination.json",
  testimonials: "/data/cms/testimonials.json",
  "testimonial-templates": "/data/cms/testimonial-templates.json",
  areas: "/data/cms/areas.json",
  "formation-levels": "/data/cms/formation-levels.json",
  statuses: "/data/cms/statuses.json",
};

let cache = {};
let apiAvailable = false;

export function uid(prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Caminho público da página do curso (ex.: /pos-graduacao/meu-curso). */
export function getCoursePublicPath(course) {
  if (!course) return "";

  const canonical = course.seo?.canonical?.trim();
  if (canonical) {
    return canonical.startsWith("/") ? canonical : `/${canonical}`;
  }

  const slug = course.slug?.trim() || course.id?.trim() || "";
  if (!slug) return "";

  const nivel = getById("formation-levels", course.nivel_formacao_id);
  const prefix = nivel?.slug || "pos-graduacao";
  return `/${prefix}/${slug}`;
}

import { authHeaders, clearSession } from "./auth.js";

async function fetchJson(url, options = {}) {
  const headers = authHeaders({ "Content-Type": "application/json", ...options.headers });
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearSession();
    window.dispatchEvent(new Event("cms:unauthorized"));
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const err = await res.json().catch(() => ({}));
      message = err.error || message;
    } else {
      const text = await res.text().catch(() => "");
      if (text && !text.includes("FUNCTION_INVOCATION_FAILED")) {
        message = text.slice(0, 200);
      } else if (res.status === 503) {
        message = "Armazenamento não configurado. Conecte Vercel Blob ao projeto.";
      }
    }
    throw new Error(message);
  }
  return res.json();
}

export async function initStore() {
  try {
    cache = await fetchJson("/api/cms");
    apiAvailable = true;
    return { ok: true, source: "api" };
  } catch {
    apiAvailable = false;
    for (const [key, path] of Object.entries(FILE_MAP)) {
      try {
        cache[key] = await fetchJson(path);
      } catch {
        cache[key] = [];
      }
    }
    return { ok: true, source: "files", readonly: true };
  }
}

export function isApiAvailable() {
  return apiAvailable;
}

export function getAll(name) {
  return cache[name] ? [...cache[name]] : [];
}

export function getById(name, id) {
  return getAll(name).find((x) => x.id === id) || null;
}

export function lookup(name, id, field = "nome") {
  const item = getById(name, id);
  return item ? item[field] : "—";
}

export async function saveCollection(name, data) {
  cache[name] = data;
  if (apiAvailable) {
    return fetchJson(`/api/cms/${name}`, { method: "PUT", body: JSON.stringify(data) });
  }
  localStorage.setItem(`cms-${name}`, JSON.stringify(data));
  return { ok: true };
}

export async function upsertItem(name, item) {
  const list = getAll(name);
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.push(item);
  const result = await saveCollection(name, list);
  return { item, result };
}

export async function deleteItem(name, id) {
  const list = getAll(name).filter((x) => x.id !== id);
  await saveCollection(name, list);
}

export function exportAll() {
  const data = {};
  for (const name of COLLECTIONS) data[name] = getAll(name);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `cms-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

export function loadFromLocalStorage() {
  if (apiAvailable) return;
  for (const name of COLLECTIONS) {
    const raw = localStorage.getItem(`cms-${name}`);
    if (raw) {
      try { cache[name] = JSON.parse(raw); } catch { /* ignore */ }
    }
  }
}
