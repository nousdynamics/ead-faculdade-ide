import { renderCatalogPage } from "./render-catalog-page.js";
import { render404Page } from "./site-layout.js";

export async function handleCatalogPageRequest(req, res, filterSlug = "") {
  if (req.method !== "GET") {
    res.status(405).setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ error: "Método não permitido" }));
  }

  const html = renderCatalogPage(filterSlug);
  if (!html) {
    res.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end(
      render404Page({
        title: "Página não encontrada — EAD Faculdade IDE",
        heading: "Página não encontrada",
        message: "O catálogo que você procura não existe ou foi movido.",
      }),
    );
  }

  res.status(200).setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.end(html);
}
