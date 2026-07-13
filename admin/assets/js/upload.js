import { authHeaders } from "./auth.js";

const MAX_BYTES = 2 * 1024 * 1024;
const PDF_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
const IMAGE_ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_ALLOWED = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function isCmsUploadedMedia(path) {
  const normalized = String(path || "").replace(/^\//, "");
  return /^assets\/(img|docs)\/(courses|coordination|professors|testimonials|uploads)\//.test(normalized);
}

export function mediaUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  const normalized = String(path).replace(/^\//, "");
  if (isCmsUploadedMedia(normalized)) return `/api/media/${normalized}`;
  return `/${normalized}`;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo"));
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(file, folder = "uploads") {
  if (!file) throw new Error("Nenhum arquivo selecionado");
  if (!IMAGE_ALLOWED.has(file.type)) {
    throw new Error("Formato não suportado. Use JPG, PNG, WebP ou GIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Imagem muito grande. Máximo de 2 MB.");
  }

  return uploadMedia(file, folder);
}

export async function uploadPdf(file, folder = "courses") {
  if (!file) throw new Error("Nenhum arquivo selecionado");
  if (file.type !== "application/pdf") {
    throw new Error("Formato não suportado. Use PDF.");
  }
  if (file.size > PDF_MAX_BYTES) {
    throw new Error("PDF muito grande. Máximo de 10 MB.");
  }

  return uploadMedia(file, folder);
}

async function uploadMedia(file, folder) {
  const data = await readFileAsBase64(file);
  const res = await fetch("/api/media/upload", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      filename: file.name,
      data,
      contentType: file.type,
      folder,
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || "Falha no upload");

  return payload.path || payload.url;
}

function imagePreviewPlaceholder(wrap) {
  return wrap?.dataset?.placeholder || "Sem imagem";
}

/** HTML da pré-visualização (com botão remover quando há imagem). */
export function renderImagePreview(path, { placeholder = "Nenhuma imagem" } = {}) {
  if (!path) {
    return `<div class="image-upload__placeholder">${placeholder}</div>`;
  }

  return `
    <img src="${mediaUrl(path)}" alt="">
    <button type="button" class="image-upload__clear" aria-label="Remover imagem" title="Remover imagem">×</button>`;
}

function setImagePreview(preview, wrap, src) {
  preview.innerHTML = `
    <img src="${src}" alt="Pré-visualização">
    <button type="button" class="image-upload__clear" aria-label="Remover imagem" title="Remover imagem">×</button>`;
}

function clearImagePreview(wrap, hidden, preview, fileInput, status, onChange) {
  hidden.value = "";
  fileInput.value = "";
  preview.innerHTML = `<div class="image-upload__placeholder">${imagePreviewPlaceholder(wrap)}</div>`;
  if (status) {
    status.hidden = true;
    status.textContent = "";
    status.classList.remove("image-upload__status--error");
  }
  onChange?.("");
}

function readImageDimensions(objectUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    img.src = objectUrl;
  });
}

async function processImageFile(file, { wrap, hidden, preview, fileInput, status, uploadFolder, onChange }) {
  if (!file) return;

  const objectUrl = URL.createObjectURL(file);
  setImagePreview(preview, wrap, objectUrl);

  if (status) {
    status.textContent = "Enviando imagem…";
    status.hidden = false;
    status.classList.remove("image-upload__status--error");
  }

  try {
    // Campos com data-exact-dimensions só aceitam a medida exata
    const exact = (wrap?.dataset?.exactDimensions || "").match(/(\d+)\s*[×x]\s*(\d+)/);
    if (exact) {
      const want = { width: Number(exact[1]), height: Number(exact[2]) };
      const dim = await readImageDimensions(objectUrl);
      if (dim.width !== want.width || dim.height !== want.height) {
        throw new Error(
          `A imagem precisa ter exatamente ${want.width}×${want.height}px — a enviada tem ${dim.width}×${dim.height}px.`,
        );
      }
    }

    const path = await uploadImage(file, uploadFolder);
    hidden.value = path;
    setImagePreview(preview, wrap, mediaUrl(path));
    if (status) {
      status.textContent = "Imagem enviada com sucesso.";
      status.classList.remove("image-upload__status--error");
    }
    onChange?.(path);
  } catch (err) {
    if (status) {
      status.textContent = err.message;
      status.classList.add("image-upload__status--error");
    }
    const current = hidden.value;
    preview.innerHTML = current
      ? renderImagePreview(current, { placeholder: imagePreviewPlaceholder(wrap) })
      : `<div class="image-upload__placeholder">${imagePreviewPlaceholder(wrap)}</div>`;
  } finally {
    URL.revokeObjectURL(objectUrl);
    fileInput.value = "";
  }
}

function bindImageDropZone(wrap, handleFile) {
  wrap.addEventListener("dragenter", (event) => {
    event.preventDefault();
    wrap.classList.add("image-upload--dragover");
  });

  wrap.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });

  wrap.addEventListener("dragleave", (event) => {
    if (wrap.contains(event.relatedTarget)) return;
    wrap.classList.remove("image-upload--dragover");
  });

  wrap.addEventListener("drop", (event) => {
    event.preventDefault();
    wrap.classList.remove("image-upload--dragover");

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    if (!IMAGE_ALLOWED.has(file.type)) {
      const status = wrap.querySelector(".image-upload__status");
      if (status) {
        status.textContent = "Formato não suportado. Use JPG, PNG, WebP ou GIF.";
        status.hidden = false;
        status.classList.add("image-upload__status--error");
      }
      return;
    }

    handleFile(file);
  });
}

export function bindImageUpload(root, { folder = "uploads", onChange } = {}) {
  const wrap = root?.closest?.("[data-image-upload]") || root;
  if (!wrap) return;

  const hidden = wrap.querySelector('input[type="hidden"]');
  const preview = wrap.querySelector(".image-upload__preview");
  const fileInput = wrap.querySelector(".image-upload__input");
  const status = wrap.querySelector(".image-upload__status");

  if (!hidden || !preview || !fileInput) return;

  const uploadFolder = folder || wrap.dataset.folder || "uploads";

  wrap.addEventListener("click", (event) => {
    if (!event.target.closest(".image-upload__clear")) return;
    event.preventDefault();
    clearImagePreview(wrap, hidden, preview, fileInput, status, onChange);
  });

  const uploadContext = { wrap, hidden, preview, fileInput, status, uploadFolder, onChange };
  const handleFile = (file) => processImageFile(file, uploadContext);

  bindImageDropZone(wrap, handleFile);

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    await handleFile(file);
  });
}

/**
 * Upload de vídeo direto ao Supabase Storage via URL assinada.
 * O arquivo não passa pela API da Vercel (sem limite de body).
 */
export async function uploadVideo(file, folder = "testimonials", onProgress) {
  if (!file) throw new Error("Nenhum arquivo selecionado");
  if (!VIDEO_ALLOWED.has(file.type)) {
    throw new Error("Formato não suportado. Use MP4, WebM ou MOV.");
  }
  if (file.size > VIDEO_MAX_BYTES) {
    throw new Error("Vídeo muito grande. Máximo de 100 MB.");
  }

  const res = await fetch("/api/media/signed-upload", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ filename: file.name, contentType: file.type, folder }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || "Falha ao preparar o upload do vídeo");

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", payload.signedUrl, true);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && typeof onProgress === "function") {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Falha no envio do vídeo (HTTP ${xhr.status}). Verifique se o bucket aceita vídeo.`));
    });
    xhr.addEventListener("error", () => reject(new Error("Falha de rede no envio do vídeo")));
    xhr.send(file);
  });

  return payload.publicUrl || payload.path;
}

export function bindVideoUpload(root, { folder = "testimonials", onChange } = {}) {
  const wrap = root?.closest?.("[data-video-upload]") || root;
  if (!wrap) return;

  const fileInput = wrap.querySelector(".video-upload__input");
  const status = wrap.querySelector(".video-upload__status");
  const preview = wrap.querySelector(".video-upload__preview");

  if (!fileInput) return;

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (status) {
      status.textContent = "Enviando vídeo… 0%";
      status.hidden = false;
      status.classList.remove("image-upload__status--error");
    }

    try {
      const url = await uploadVideo(file, wrap.dataset.folder || folder, (pct) => {
        if (status) status.textContent = `Enviando vídeo… ${pct}%`;
      });
      if (status) status.textContent = "Vídeo enviado com sucesso.";
      if (preview) {
        preview.innerHTML = `<a href="${url}" target="_blank" rel="noopener">${file.name}</a>`;
      }
      onChange?.(url);
    } catch (err) {
      if (status) {
        status.textContent = err.message;
        status.classList.add("image-upload__status--error");
      }
    } finally {
      fileInput.value = "";
    }
  });
}

export function bindPdfUpload(root, { folder = "courses", onChange } = {}) {
  const wrap = root?.closest?.("[data-pdf-upload]") || root;
  if (!wrap) return;

  const urlInput = wrap.querySelector('input[type="text"]');
  const fileInput = wrap.querySelector(".pdf-upload__input");
  const status = wrap.querySelector(".pdf-upload__status");
  const preview = wrap.querySelector(".pdf-upload__preview");

  if (!urlInput || !fileInput) return;

  const uploadFolder = folder || wrap.dataset.folder || "courses";

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (status) {
      status.textContent = "Enviando PDF…";
      status.hidden = false;
      status.classList.remove("image-upload__status--error");
    }

    try {
      const path = await uploadPdf(file, uploadFolder);
      urlInput.value = path;
      if (preview) {
        const label = file.name || "PDF enviado";
        preview.innerHTML = `<a href="${mediaUrl(path)}" target="_blank" rel="noopener">${label}</a>`;
      }
      if (status) {
        status.textContent = "PDF enviado com sucesso.";
      }
      onChange?.(path);
    } catch (err) {
      if (status) {
        status.textContent = err.message;
        status.classList.add("image-upload__status--error");
      }
    } finally {
      fileInput.value = "";
    }
  });
}
