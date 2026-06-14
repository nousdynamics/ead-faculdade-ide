import { writeFile, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { hasBlobStorage, writeBlob } from "./blob-storage.js";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const EXT_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
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
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    return ext === ".jpeg" ? ".jpg" : ext;
  }
  return EXT_BY_MIME[mimeType] || ".jpg";
}

export async function saveUploadedImage({ filename, data, contentType, folder = "uploads" }) {
  if (!ALLOWED.has(contentType)) {
    throw Object.assign(new Error("Formato não suportado. Use JPG, PNG, WebP ou GIF."), { status: 400 });
  }

  const buffer = Buffer.from(data, "base64");
  if (!buffer.length) {
    throw Object.assign(new Error("Arquivo vazio ou inválido"), { status: 400 });
  }
  if (buffer.length > MAX_BYTES) {
    throw Object.assign(new Error("Imagem muito grande. Máximo de 2 MB."), { status: 400 });
  }

  const ext = resolveExtension(filename, contentType);
  const storedName = `${Date.now()}-${safeFilename(filename).replace(/\.[^.]+$/, "")}${ext}`;
  const blobPath = `${folder}/${storedName}`;

  if (hasBlobStorage()) {
    const result = await writeBlob(blobPath, buffer, contentType);
    const url = result?.url || result?.downloadUrl;
    if (!url) {
      throw Object.assign(new Error("Upload concluído, mas URL não retornada pelo Blob"), { status: 502 });
    }
    return { url, path: url };
  }

  const localDir = join(process.cwd(), "assets", "img", folder);
  await mkdir(localDir, { recursive: true });
  const localPath = join(localDir, storedName);
  await writeFile(localPath, buffer);

  const publicPath = `assets/img/${folder}/${storedName}`;
  return { url: `/${publicPath}`, path: publicPath };
}
