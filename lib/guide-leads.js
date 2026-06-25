import { readCollection } from "./cms.js";
import { writeBlob } from "./blob-storage.js";
import { getStorageProvider } from "./storage-provider.js";
import { insertSupabaseGuideLead } from "./supabase/cms-storage.js";
import { toMediaUrl } from "./media-url.js";
import { jsonResponse, readJsonBody } from "./http.js";

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

async function findCourseBySlug(slug) {
  const courses = await readCollection("courses");
  return courses.find((course) => course.slug === slug) || null;
}

function resolveGuidePdfUrl(course) {
  const pdf = course?.guia?.pdf?.trim() || course?.guia_pdf?.trim() || "";
  if (!pdf) return "";
  if (/^https?:\/\//i.test(pdf)) return pdf;
  return toMediaUrl(pdf);
}

export async function submitGuideLead(courseSlug, payload) {
  const slug = String(courseSlug || "").trim();
  if (!slug) {
    return { status: 400, body: { error: "Curso inválido" } };
  }

  const course = await findCourseBySlug(slug);
  if (!course) {
    return { status: 404, body: { error: "Curso não encontrado" } };
  }

  const downloadUrl = resolveGuidePdfUrl(course);
  if (!downloadUrl) {
    return { status: 503, body: { error: "Guia do curso indisponível no momento." } };
  }

  const nome = String(payload?.nome || "").trim();
  const email = String(payload?.email || "").trim();
  const telefone = String(payload?.telefone || "").trim();
  const consent = payload?.consent === true || payload?.consent === "true" || payload?.consent === 1;

  if (!nome || !email || !telefone || !consent) {
    return { status: 400, body: { error: "Preencha todos os campos obrigatórios." } };
  }

  if (!isValidEmail(email)) {
    return { status: 400, body: { error: "Informe um e-mail válido." } };
  }

  if (normalizePhone(telefone).length < 10) {
    return { status: 400, body: { error: "Informe um telefone válido." } };
  }

  const lead = {
    courseSlug: slug,
    courseTitle: course.titulo || "",
    nome,
    email,
    telefone,
    consent: true,
    createdAt: new Date().toISOString(),
  };

  if (getStorageProvider() === "supabase") {
    await insertSupabaseGuideLead(lead);
  } else {
    const pathname = `leads/guide/${slug}/${Date.now()}.json`;
    await writeBlob(pathname, JSON.stringify(lead, null, 2) + "\n");
  }

  return { status: 200, body: { ok: true, downloadUrl } };
}

export async function handleGuideLeadRequest(req, res, courseSlug) {
  if (req.method !== "POST") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  const payload = await readJsonBody(req);
  const result = await submitGuideLead(courseSlug, payload);
  return jsonResponse(res, result.status, result.body);
}
