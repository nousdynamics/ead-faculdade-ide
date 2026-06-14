import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { list } from "@vercel/blob";
import { writeBlob } from "./blob-storage.js";
import { readAllCollections } from "./cms.js";
import { renderCoursePage } from "./render-course-page.js";

const PAGE_PREFIX = "pages/pos-graduacao";

export function courseSlug(course) {
  return course?.slug?.trim() || course?.id?.trim() || "";
}

export function isPosGraduacaoCourse(course) {
  return course?.nivel_formacao_id === "pos-graduacao" || !course?.nivel_formacao_id;
}

export async function loadCourseContext() {
  const all = await readAllCollections();
  return {
    courses: all.courses || [],
    professors: all.professors || [],
    coordination: all.coordination || [],
    testimonials: all.testimonials || [],
    statuses: all.statuses || [],
  };
}

export async function publishCoursePage(course, ctx) {
  if (!isPosGraduacaoCourse(course)) {
    return { slug: courseSlug(course), skipped: true, reason: "not-pos-graduacao" };
  }

  const slug = courseSlug(course);
  if (!slug) {
    return { slug: "", skipped: true, reason: "missing-slug" };
  }

  if (course.publicado === false) {
    return { slug, path: `/pos-graduacao/${slug}`, published: false, skipped: true };
  }

  const html = renderCoursePage(course, ctx);
  const pathname = `${PAGE_PREFIX}/${slug}.html`;

  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    await writeBlob(pathname, html, "text/html; charset=utf-8");
  }

  try {
    const outDir = join(process.cwd(), "pos-graduacao", slug);
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, "index.html"), html, "utf8");
  } catch {
    /* filesystem read-only no runtime Vercel */
  }

  return { slug, path: `/pos-graduacao/${slug}`, published: true };
}

export async function publishCoursePages(courses, ctx = null) {
  const context = ctx || (await loadCourseContext());
  const list = Array.isArray(courses) ? courses : context.courses;
  const results = [];

  for (const course of list) {
    if (!isPosGraduacaoCourse(course)) continue;
    results.push(
      await publishCoursePage(course, {
        ...context,
        courses: list,
      }),
    );
  }

  return results;
}

async function readPageFromBlob(slug) {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) return null;

  const pathname = `${PAGE_PREFIX}/${slug}.html`;
  try {
    const { blobs } = await list({ prefix: pathname, limit: 5 });
    const match = blobs.find((blob) => blob.pathname === pathname);
    if (!match) return null;

    const res = await fetch(match.url);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

async function readPageFromDisk(slug) {
  try {
    return await readFile(join(process.cwd(), "pos-graduacao", slug, "index.html"), "utf8");
  } catch {
    return null;
  }
}

export async function resolveCoursePageHtml(slug) {
  const normalized = String(slug || "").trim();
  if (!normalized) return null;

  const fromBlob = await readPageFromBlob(normalized);
  if (fromBlob) return fromBlob;

  try {
    const ctx = await loadCourseContext();
    const course = ctx.courses.find((item) => courseSlug(item) === normalized);
    if (course && course.publicado !== false && isPosGraduacaoCourse(course)) {
      return renderCoursePage(course, ctx);
    }
  } catch {
    /* fallback abaixo */
  }

  return readPageFromDisk(normalized);
}

export async function handleCoursePageRequest(req, res, slug) {
  if (req.method !== "GET") {
    res.status(405).setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ error: "Método não permitido" }));
  }

  const html = await resolveCoursePageHtml(slug);
  if (!html) {
    res.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end("<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\"><title>Curso não encontrado</title></head><body><h1>Curso não encontrado</h1><p><a href=\"/\">Voltar ao início</a></p></body></html>");
  }

  res.status(200).setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.end(html);
}
