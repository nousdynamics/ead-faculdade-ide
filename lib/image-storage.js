import { writeFile, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { hasMediaBlobStorage, writeMediaBlob, MEDIA_STORAGE_ERROR } from "./blob-storage.js";
import { getMediaStorageProvider } from "./storage-provider.js";
import { uploadSupabaseMedia, createSignedMediaUpload } from "./supabase/media-storage.js";
import { toMediaUrl } from "./media-url.js";

const MAX_BYTES = 2 * 1024 * 1024;
const PDF_MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const PDF_ALLOWED = new Set(["application/pdf"]);
const VIDEO_ALLOWED = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
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

  if (getMediaStorageProvider() === "supabase") {
    await uploadSupabaseMedia(publicPath, buffer, contentType);
    return { url: toMediaUrl(publicPath), path: publicPath };
  }

  if (hasMediaBlobStorage()) {
    const blobPathname = `media/${publicPath}`;
    await writeMediaBlob(blobPathname, buffer, contentType);
    return { url: toMediaUrl(publicPath), path: publicPath };
  }

  if (process.env.VERCEL && getMediaStorageProvider() !== "local") {
    throw Object.assign(new Error(MEDIA_STORAGE_ERROR), { status: 503 });
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

/**
 * URL assinada p/ upload de vídeo direto ao Supabase Storage (depoimentos).
 * O arquivo não passa pela function — evita o limite de ~4,5 MB de body da Vercel.
 */
export async function createSignedVideoUpload({ filename, contentType, folder = "testimonials" }) {
  if (!VIDEO_ALLOWED.has(contentType)) {
    throw Object.assign(new Error("Formato de vídeo não suportado. Use MP4, WebM ou MOV."), { status: 400 });
  }

  if (getMediaStorageProvider() !== "supabase") {
    throw Object.assign(
      new Error("Upload nativo de vídeo requer Supabase Storage configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."),
      { status: 503 },
    );
  }

  const safeFolder = String(folder || "testimonials").replace(/[^a-z0-9/_-]/gi, "").replace(/^\/+|\/+$/g, "") || "testimonials";
  const ext = resolveExtension(filename, contentType);
  const storedName = `${Date.now()}-${safeFilename(filename).replace(/\.[^.]+$/, "")}${ext}`;
  const publicPath = `assets/video/${safeFolder}/${storedName}`.replace(/\/+/g, "/");

  return createSignedMediaUpload(publicPath);
}
