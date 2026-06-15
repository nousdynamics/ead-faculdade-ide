/**
 * Sincroniza data/cms/* → Vercel Blob (store gru1) e republica páginas de curso.
 * Usa `vercel blob put` (auth do projeto) — não depende de BLOB_READ_WRITE_TOKEN local.
 *
 * Pré-requisito: `npx vercel link` no projeto e login ativo.
 */
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { COLLECTIONS } from "../lib/cms.js";
import { loadCourseContext, publishCoursePage, isPosGraduacaoCourse } from "../lib/course-pages.js";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const CMS_DIR = join(ROOT, "data", "cms");
const TMP_DIR = join(ROOT, ".tmp-blob-sync");

function blobPut(localPath, pathname, access = "private") {
  const cmd = `npx vercel blob put ${JSON.stringify(localPath)} --pathname ${JSON.stringify(pathname)} --access ${access} --allow-overwrite true`;
  execSync(cmd, { cwd: ROOT, stdio: "inherit", shell: true });
  console.log(`✓ ${pathname}`);
}

async function syncCollections() {
  for (const filename of Object.values(COLLECTIONS)) {
    const localPath = join(CMS_DIR, filename);
    await blobPut(localPath, `cms/${filename}`, "private");
  }

  try {
    const accountPath = join(CMS_DIR, "account.json");
    await readFile(accountPath, "utf8");
    await blobPut(accountPath, "cms/account.json", "private");
  } catch {
    console.log("· account.json ausente no repo (ok)");
  }
}

async function republishCoursePages() {
  await mkdir(TMP_DIR, { recursive: true });
  const ctx = await loadCourseContext();
  const published = [];

  for (const course of ctx.courses) {
    if (!isPosGraduacaoCourse(course) || course.publicado === false) continue;

    const result = await publishCoursePage(course, ctx);
    if (!result.published) continue;

    const slug = course.slug || course.id;
    const tmpHtml = join(TMP_DIR, `${slug}.html`);
    const { renderCoursePage } = await import("../lib/render-course-page.js");
    const html = renderCoursePage(course, ctx);
    await writeFile(tmpHtml, html, "utf8");
    await blobPut(tmpHtml, `pages/pos-graduacao/${slug}.html`, "private");
    published.push(result.path);
  }

  await rm(TMP_DIR, { recursive: true, force: true });
  return published;
}

async function main() {
  console.log("Store canônica: store_i80YqqvfBoSS9Iv7 (gru1)\n");
  console.log("Sincronizando CMS…\n");
  await syncCollections();

  console.log("\nRepublicando páginas de curso…\n");
  const paths = await republishCoursePages();
  console.log(`\n✓ ${paths.length} página(s) publicada(s)`);
  paths.forEach((p) => console.log(`  → ${p}`));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
