import { authHeaders } from "./auth.js";

const MAX_BYTES = 2 * 1024 * 1024;
const PDF_MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function mediaUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `/${String(path).replace(/^\//, "")}`;
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

export function bindImageUpload(root, { folder = "uploads", onChange } = {}) {
  const wrap = root?.closest?.("[data-image-upload]") || root;
  if (!wrap) return;

  const hidden = wrap.querySelector('input[type="hidden"]');
  const preview = wrap.querySelector(".image-upload__preview");
  const fileInput = wrap.querySelector(".image-upload__input");
  const status = wrap.querySelector(".image-upload__status");

  if (!hidden || !preview || !fileInput) return;

  const uploadFolder = folder || wrap.dataset.folder || "uploads";

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${objectUrl}" alt="Pré-visualização">`;

    if (status) {
      status.textContent = "Enviando imagem…";
      status.hidden = false;
    }

    try {
      const path = await uploadImage(file, uploadFolder);
      hidden.value = path;
      preview.innerHTML = `<img src="${mediaUrl(path)}" alt="Pré-visualização">`;
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
        ? `<img src="${mediaUrl(current)}" alt="Pré-visualização">`
        : `<div class="image-upload__placeholder">${wrap.dataset.placeholder || "Sem imagem"}</div>`;
    } finally {
      URL.revokeObjectURL(objectUrl);
      fileInput.value = "";
    }
  });
}

export function bindPdfUpload(root, { folder = "courses", onChange } = {}) {
  const wrap = root?.closest?.("[data-pdf-upload]") || root;
  if (!wrap) return;

  const urlInput = wrap.querySelector('input[type="text"][name="inv_pdf_descontos"]');
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
