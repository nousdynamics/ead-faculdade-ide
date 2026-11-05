import { readCollection } from "./cms.js";
import { courseUrl } from "./catalog.js";
import siteConfig from "../data/site.json" with { type: "json" };

const STATIC_PAGES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/paginas-de-cursos", changefreq: "weekly", priority: "0.8" },
  { path: "/termos-de-uso", changefreq: "yearly", priority: "0.3" },
  { path: "/politica-de-privacidade", changefreq: "yearly", priority: "0.3" },
];

const escapeXml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[ch]);

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Sitemap a partir do CMS: cursos novos ou despublicados no admin entram ou saem sozinhos. */
export async function buildSitemapXml() {
  const base = siteConfig.url.replace(/\/$/, "");
  const courses = (await readCollection("courses")) || [];

  const entries = [
    ...STATIC_PAGES.map((page) => ({ ...page, loc: `${base}${page.path === "/" ? "/" : page.path}` })),
    ...courses
      .filter((course) => course.publicado !== false && (course.slug || course.id))
      .map((course) => ({
        loc: `${base}${courseUrl(course)}`,
        lastmod: /^\d{4}-\d{2}-\d{2}/.test(course.atualizado_em || "") ? course.atualizado_em.slice(0, 10) : "",
        changefreq: "weekly",
        priority: "0.9",
      })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(urlEntry).join("\n")}
</urlset>
`;
}

export async function handleSitemapRequest(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405);
    return res.end();
  }

  const xml = await buildSitemapXml();
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=3600");
  res.status(200);
  return res.end(req.method === "HEAD" ? undefined : xml);
}
