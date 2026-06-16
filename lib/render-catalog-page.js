import { catalogCanonical, resolveCatalogPage } from "./catalog-routes.js";
import {
  renderFooter,
  renderHeader,
  renderSiteLayoutScripts,
  renderSiteMotionStyles,
} from "./site-layout.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderCatalogPage(filterSlug = "") {
  const page = resolveCatalogPage(filterSlug);
  if (!page) return null;

  const canonical = catalogCanonical(page.path);
  const prefilterAttr = page.nivelNome
    ? ` data-prefilter-nivel="${escapeHtml(page.nivelNome)}"`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:type" content="website">
  <link rel="icon" href="/assets/img/FAV-ICON-3.svg" sizes="any">
  <link rel="stylesheet" href="/assets/css/tokens.css">
  <link rel="stylesheet" href="/assets/css/base.css">
  <link rel="stylesheet" href="/assets/css/components.css">
  <link rel="stylesheet" href="/assets/css/home.css">
  <link rel="stylesheet" href="/assets/css/catalog-page.css">
  ${renderSiteMotionStyles({ base: "/" })}
  <link rel="stylesheet" href="/assets/css/responsive.css">
</head>
<body class="site-layout catalog-page">
  ${renderHeader({ base: "/", ctaHref: "/#inscricao" })}
  <main>
    <section class="catalog-page__hero">
      <div class="container">
        <h1 class="catalog-page__title">${escapeHtml(page.heading)}</h1>
        <p class="catalog-page__lead">${escapeHtml(page.description)}</p>
      </div>
    </section>

    <section class="catalog catalog--page" id="cursos"${prefilterAttr}>
      <div class="container catalog__layout">
        <div class="catalog__intro">
          <form class="filters" aria-label="Filtrar cursos">
            <div class="field field--nivel">
              <label for="f-nivel">Você tem preferência por:</label>
              <select id="f-nivel">
                <option value="">Selecione o nível do curso</option>
              </select>
            </div>
            <div class="field">
              <label for="f-area">Área de interesse:</label>
              <select id="f-area">
                <option value="">Selecione uma área de interesse:</option>
              </select>
            </div>
            <div class="field">
              <label for="f-status">Filtro de Status:</label>
              <select id="f-status">
                <option value="">Selecione o momento do curso:</option>
              </select>
            </div>
          </form>
        </div>

        <div class="course-grid" id="courseGrid">
          <p class="course-grid__empty" hidden>Nenhum curso encontrado para os filtros selecionados.</p>
        </div>
      </div>
    </section>
  </main>
  ${renderFooter({ base: "/" })}
  <script src="/assets/js/catalog.js" defer></script>
  <script src="/assets/js/course-filter.js" defer></script>
  ${renderSiteLayoutScripts({ base: "/" })}
</body>
</html>`;
}
