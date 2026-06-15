import { readAllCollections } from "./cms.js";
import { resolveAssetUrl } from "./media-url.js";
import { jsonResponse } from "./http.js";

function byId(items) {
  return Object.fromEntries((items || []).map((item) => [item.id, item]));
}

export async function buildCatalogPayload() {
  const all = await readAllCollections();
  const areas = byId(all.areas);
  const levels = byId(all["formation-levels"]);
  const statuses = byId(all.statuses);

  const published = (all.courses || []).filter((course) => course.publicado !== false);

  const courses = published.map((course) => {
    const area = areas[course.area_id];
    const nivel = levels[course.nivel_formacao_id];
    const status = statuses[course.status_curso_id];
    const slug = course.slug || course.id;

    return {
      id: course.id,
      slug,
      titulo: course.titulo || "",
      imagem: resolveAssetUrl(course.imagem_capa) || course.imagem_capa || "",
      url: course.seo?.canonical || `/pos-graduacao/${slug}`,
      nivel: nivel?.nome || "",
      area: area?.nome || "",
      status: status?.nome || "",
    };
  });

  const uniq = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return {
    courses,
    filters: {
      niveis: uniq(courses.map((c) => c.nivel)),
      areas: uniq(courses.map((c) => c.area)),
      statuses: uniq(courses.map((c) => c.status)),
    },
  };
}

export async function handleCatalogRequest(req, res) {
  if (req.method !== "GET") {
    return jsonResponse(res, 405, { error: "Método não permitido" });
  }

  const payload = await buildCatalogPayload();
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return jsonResponse(res, 200, payload);
}
