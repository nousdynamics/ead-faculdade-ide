/**
 * CLI — gera arquivos locais em pos-graduacao/{slug}/index.html
 * Uso: node scripts/generate-course-pages.mjs [--slug=meu-curso] [--all]
 */
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { publishCoursePages, courseSlug, isPosGraduacaoCourse } from "../api/lib/course-pages.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

async function loadJson(relPath) {
  return JSON.parse(await readFile(join(ROOT, relPath), "utf8"));
}

async function main() {
  const [courses, professors, coordination, testimonials, testimonialTemplates, statuses] = await Promise.all([
    loadJson("data/cms/courses.json"),
    loadJson("data/cms/professors.json"),
    loadJson("data/cms/coordination.json"),
    loadJson("data/cms/testimonials.json"),
    loadJson("data/cms/testimonial-templates.json"),
    loadJson("data/cms/statuses.json"),
  ]);

  const ctx = { courses, professors, coordination, testimonials, testimonialTemplates, statuses };
  let selected = courses.filter(isPosGraduacaoCourse);

  if (args.slug) {
    selected = selected.filter((c) => courseSlug(c) === args.slug || c.id === args.slug);
  } else if (args.all !== true) {
    selected = selected.filter((c) => c.publicado !== false);
  }

  if (!selected.length) {
    console.error("Nenhum curso encontrado para gerar.");
    process.exit(1);
  }

  const results = await publishCoursePages(selected, ctx);
  for (const result of results) {
    if (result.skipped) {
      console.log(`− ${result.slug || "(sem slug)"} ignorado (${result.reason || "rascunho"})`);
    } else {
      console.log(`✓ pos-graduacao/${result.slug}/index.html`);
    }
  }

  console.log(`\n${results.filter((r) => !r.skipped).length} página(s) publicada(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
