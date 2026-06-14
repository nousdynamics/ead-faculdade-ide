import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { list, put } from "@vercel/blob";

export const COLLECTIONS = {
  courses: "courses.json",
  professors: "professors.json",
  coordination: "coordination.json",
  "testimonials-text": "testimonials-text.json",
  "testimonials-video": "testimonials-video.json",
  "testimonials-image": "testimonials-image.json",
  areas: "areas.json",
  "formation-levels": "formation-levels.json",
  statuses: "statuses.json",
};

const BLOB_PREFIX = "cms/";

function blobPathname(name) {
  return `${BLOB_PREFIX}${COLLECTIONS[name]}`;
}

function repoPath(name) {
  return join(process.cwd(), "data", "cms", COLLECTIONS[name]);
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

export async function readCollection(name) {
  if (!COLLECTIONS[name]) {
    throw Object.assign(new Error("Coleção não encontrada"), { status: 404 });
  }

  const fromBlob = await readFromBlob(blobPathname(name));
  if (fromBlob !== null) return fromBlob;

  return readFromRepo(name);
}

export async function writeCollection(name, data) {
  if (!COLLECTIONS[name]) {
    throw Object.assign(new Error("Coleção não encontrada"), { status: 404 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw Object.assign(
      new Error("Armazenamento não configurado. Adicione Vercel Blob ao projeto (Storage → Blob)."),
      { status: 503 },
    );
  }

  await put(blobPathname(name), JSON.stringify(data, null, 2) + "\n", {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function readAllCollections() {
  const all = {};
  for (const key of Object.keys(COLLECTIONS)) {
    all[key] = await readCollection(key);
  }
  return all;
}
