const COLLECTIONS = [
  "courses",
  "professors",
  "coordination",
  "testimonials-text",
  "testimonials-video",
  "testimonials-image",
  "areas",
  "formation-levels",
  "statuses",
];

const FILE_MAP = {
  courses: "../data/cms/courses.json",
  professors: "../data/cms/professors.json",
  coordination: "../data/cms/coordination.json",
  "testimonials-text": "../data/cms/testimonials-text.json",
  "testimonials-video": "../data/cms/testimonials-video.json",
  "testimonials-image": "../data/cms/testimonials-image.json",
  areas: "../data/cms/areas.json",
  "formation-levels": "../data/cms/formation-levels.json",
  statuses: "../data/cms/statuses.json",
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
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erro ${res.status}`);
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
    await fetchJson(`/api/cms/${name}`, { method: "PUT", body: JSON.stringify(data) });
  } else {
    localStorage.setItem(`cms-${name}`, JSON.stringify(data));
  }
}

export async function upsertItem(name, item) {
  const list = getAll(name);
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.push(item);
  await saveCollection(name, list);
  return item;
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
