import { writeFile, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { hasBlobStorage, writePublicBlob, STORAGE_ERROR } from "./blob-storage.js";
import { toMediaUrl } from "./media-url.js";

const MAX_BYTES = 2 * 1024 * 1024;
const PDF_MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const PDF_ALLOWED = new Set(["application/pdf"]);

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};

function safeFilename(name) {
  const base = String(name || "imagem")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return base || "imagem";
}

function resolveExtension(filename, mimeType) {
  const ext = extname(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"].includes(ext)) {
    return ext === ".jpeg" ? ".jpg" : ext;
  }
  return EXT_BY_MIME[mimeType] || ".bin";
}

async function persistBuffer({ buffer, filename, contentType, folder, assetRoot, publicPrefix }) {
  const ext = resolveExtension(filename, contentType);
  const storedName = `${Date.now()}-${safeFilename(filename).replace(/\.[^.]+$/, "")}${ext}`;
  const publicPath = `${publicPrefix}/${folder}/${storedName}`.replace(/\/+/g, "/");

  if (hasBlobStorage()) {
    const blobPathname = `media/${publicPath}`;
    await writePublicBlob(blobPathname, buffer, contentType);
    return { url: toMediaUrl(publicPath), path: publicPath };
  }

  if (process.env.VERCEL) {
    throw Object.assign(new Error(STORAGE_ERROR), { status: 503 });
  }

  const localDir = join(process.cwd(), assetRoot, folder);
  await mkdir(localDir, { recursive: true });
  const localPath = join(localDir, storedName);
  await writeFile(localPath, buffer);

  return { url: toMediaUrl(publicPath), path: publicPath };
}

export async function saveUploadedMedia({ filename, data, contentType, folder = "uploads" }) {
  const buffer = Buffer.from(data, "base64");
  if (!buffer.length) {
    throw Object.assign(new Error("Arquivo vazio ou inválido"), { status: 400 });
  }

  if (IMAGE_ALLOWED.has(contentType)) {
    if (buffer.length > MAX_BYTES) {
      throw Object.assign(new Error("Imagem muito grande. Máximo de 2 MB."), { status: 400 });
    }
    return persistBuffer({
      buffer,
      filename,
      contentType,
      folder,
      assetRoot: join("assets", "img"),
      publicPrefix: "assets/img",
    });
  }

  if (PDF_ALLOWED.has(contentType)) {
    if (buffer.length > PDF_MAX_BYTES) {
      throw Object.assign(new Error("PDF muito grande. Máximo de 10 MB."), { status: 400 });
    }
    return persistBuffer({
      buffer,
      filename,
      contentType,
      folder: folder.startsWith("docs/") ? folder : `docs/${folder}`,
      assetRoot: join("assets"),
      publicPrefix: "assets",
    });
  }

  throw Object.assign(new Error("Formato não suportado. Use JPG, PNG, WebP, GIF ou PDF."), { status: 400 });
}

export async function saveUploadedImage(options) {
  return saveUploadedMedia(options);
}
