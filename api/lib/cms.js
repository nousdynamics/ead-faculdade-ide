import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { list } from "@vercel/blob";
import { writeBlob } from "./blob-storage.js";

export const COLLECTIONS = {
  courses: "courses.json",
  professors: "professors.json",
  coordination: "coordination.json",
  testimonials: "testimonials.json",
  "testimonial-templates": "testimonial-templates.json",
  areas: "areas.json",
  "formation-levels": "formation-levels.json",
  statuses: "statuses.json",
};

const LEGACY_TESTIMONIALS = {
  "testimonials-text": "texto",
  "testimonials-video": "video",
  "testimonials-image": "imagem",
};

const BLOB_PREFIX = "cms/";

function blobPathname(name) {
  return `${BLOB_PREFIX}${COLLECTIONS[name]}`;
}

function repoPath(name) {
  return join(process.cwd(), "data", "cms", COLLECTIONS[name]);
}

function legacyRepoPath(legacyKey) {
  return join(process.cwd(), "data", "cms", `${legacyKey}.json`);
}

async function readFromBlob(pathname) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  try {
    const { blobs } = await list({ prefix: pathname, limit: 10 });
    const match = blobs.find((blob) => blob.pathname === pathname);
    if (!match) return null;

    const res = await fetch(match.url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function readFromRepo(name) {
  const raw = await readFile(repoPath(name), "utf8");
  return JSON.parse(raw);
}

async function readLegacyTestimonialsFromRepo() {
  const merged = [];

  for (const [legacyKey, tipo] of Object.entries(LEGACY_TESTIMONIALS)) {
    try {
      const raw = await readFile(legacyRepoPath(legacyKey), "utf8");
      const items = JSON.parse(raw);
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        merged.push({
          ...item,
          tipo: item.tipo || tipo,
          video_url: item.video_url || "",
          thumbnail: item.thumbnail || "",
          imagem: item.imagem || "",
          legenda: item.legenda || "",
          profissao: item.profissao || "",
          texto: item.texto || "",
        });
      }
    } catch {
      /* arquivo legado ausente */
    }
  }

  return merged;
}

async function readTestimonialsCollection() {
  const fromBlob = await readFromBlob(blobPathname("testimonials"));
  if (fromBlob !== null) return fromBlob;

  try {
    return await readFromRepo("testimonials");
  } catch {
    return readLegacyTestimonialsFromRepo();
  }
}

export async function readCollection(name) {
  if (!COLLECTIONS[name]) {
    throw Object.assign(new Error("Coleção não encontrada"), { status: 404 });
  }

  if (name === "testimonials") {
    return readTestimonialsCollection();
  }

  const fromBlob = await readFromBlob(blobPathname(name));
  if (fromBlob !== null) return fromBlob;

  return readFromRepo(name);
}

export async function writeCollection(name, data) {
  if (!COLLECTIONS[name]) {
    throw Object.assign(new Error("Coleção não encontrada"), { status: 404 });
  }

  if (data === undefined || data === null) {
    throw Object.assign(new Error("Corpo da requisição inválido"), { status: 400 });
  }

  await writeBlob(blobPathname(name), JSON.stringify(data, null, 2) + "\n");

  if (name === "courses") {
    const { publishCoursePages } = await import("./course-pages.js");
    return publishCoursePages(data);
  }
}

export async function readAllCollections() {
  const all = {};
  for (const key of Object.keys(COLLECTIONS)) {
    all[key] = await readCollection(key);
  }
  return all;
}
