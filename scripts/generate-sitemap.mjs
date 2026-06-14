import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const site = JSON.parse(await readFile(join(ROOT, "data", "site.json"), "utf8"));
const courses = JSON.parse(await readFile(join(ROOT, "data", "cms", "courses.json"), "utf8"));

const base = site.url.replace(/\/$/, "");
const today = new Date().toISOString().slice(0, 10);

const urls = [
  { loc: `${base}/`, changefreq: "weekly", priority: "1.0", lastmod: today },
  ...courses
    .filter((c) => c.publicado !== false)
    .map((c) => ({
      loc: `${base}${c.seo?.canonical || `/pos-graduacao/${c.slug}`}`,
      changefreq: "weekly",
      priority: "0.9",
      lastmod: (c.atualizado_em || today).slice(0, 10),
    })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;

await writeFile(join(ROOT, "sitemap.xml"), xml, "utf8");
console.log(`sitemap.xml gerado com ${urls.length} URLs`);
