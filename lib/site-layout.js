/**
 * Header, footer e páginas de erro compartilhados entre home, cursos e 404.
 */
import { CATALOG_PAGES } from "./catalog-routes.js";
import { renderFooterSocialLinks } from "./social-icons.js";

const SITE_URL = "https://ead.faculdadeide.edu.br";
const GTM_ID = "GTM-WCSJXXTX";

export function renderGtmHead() {
  return `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');</script>
<!-- End Google Tag Manager -->`;
}

export function renderGtmBody() {
  return `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
}

export function renderHeader({ base = "", ctaHref = "#inscricao" } = {}) {
  return `<header class="site-header" id="topo">
    <div class="container site-header__inner">
      <a class="site-header__logo" href="/" aria-label="Faculdade IDE EAD — início">
        <img src="${base}assets/img/LOGO-IDE-ONLINE-02.svg" width="229" height="88" alt="Faculdade IDE EAD">
      </a>
      <button
        type="button"
        class="site-nav__toggle"
        aria-expanded="false"
        aria-controls="site-nav-panel"
      >
        <span class="sr-only">Abrir menu</span>
        <span class="site-nav__toggle-bars" aria-hidden="true"></span>
      </button>
      <div class="site-nav" id="site-nav-panel">
        <nav class="site-nav__menu" aria-label="Menu principal">
          <a href="${CATALOG_PAGES["pos-graduacao"].path}">${CATALOG_PAGES["pos-graduacao"].menuLabel}</a>
          <span class="site-nav__divider" aria-hidden="true"></span>
          <a href="${CATALOG_PAGES.graduacao.path}">${CATALOG_PAGES.graduacao.menuLabel}</a>
          <span class="site-nav__divider" aria-hidden="true"></span>
          <a href="${CATALOG_PAGES["curta-duracao"].path}">${CATALOG_PAGES["curta-duracao"].menuLabel}</a>
          <span class="site-nav__divider" aria-hidden="true"></span>
          <a href="${CATALOG_PAGES.todos.path}">${CATALOG_PAGES.todos.menuLabel}</a>
        </nav>
        <div class="site-nav__actions">
          <a class="site-header__cta" href="${ctaHref}">inscreva-se</a>
        </div>
      </div>
    </div>
  </header>`;
}

export function renderFooter({ base = "" } = {}) {
  const waUrl = "https://wa.me/5571991082998";

  return `<footer class="site-footer">
    <div class="container site-footer__grid">
      <div class="site-footer__col">
        <div class="site-footer__brand">
          <img class="site-footer__logo" src="${base}assets/img/LOGO-IDE-ONLINE-02.svg" alt="Faculdade IDE EAD">
          <a class="site-footer__emec-logo" href="https://emec.mec.gov.br/" target="_blank" rel="noopener noreferrer">
            <img src="${base}assets/img/e-mec.webp" alt="e-MEC — consulte o cadastro da instituição no Sistema e-MEC" width="110" height="32" loading="lazy">
          </a>
        </div>
        <div class="site-footer__block">
          <h3>Políticas</h3>
          <ul>
            <li><a href="/termos-de-uso">Termos de uso</a></li>
            <li><a href="/politica-de-privacidade">Política de privacidade</a></li>
          </ul>
        </div>
      </div>
      <div class="site-footer__col site-footer__col--stack-sm">
        <div class="site-footer__block">
          <h3>Institucional</h3>
          <ul>
            <li><a href="https://www.faculdadeide.edu.br/quem-somos" target="_blank" rel="noopener noreferrer">Quem somos</a></li>
            <li><a href="https://www.faculdadeide.edu.br/biblioteca" target="_blank" rel="noopener noreferrer">Biblioteca</a></li>
          </ul>
        </div>
        <div class="site-footer__block site-footer__block--flush">
          <ul>
            <li><a href="${waUrl}" target="_blank" rel="noopener noreferrer">Fale conosco</a></li>
          </ul>
        </div>
      </div>
      <div class="site-footer__col">
        <div class="site-footer__block site-footer__block--tight">
          <h3>Nossos escritórios</h3>
          <p>Sede: Av. Antônio de Goes, 742<br>Recife/PE</p>
        </div>
        <div class="site-footer__block site-footer__block--tight">
          <h3>Contatos</h3>
          <p class="site-footer__phone"><a href="${waUrl}" target="_blank" rel="noopener noreferrer">WhatsApp: (81) 99108-2998</a></p>
        </div>
        <div class="site-footer__block">
          <h3>Redes sociais</h3>
          ${renderFooterSocialLinks()}
        </div>
      </div>
    </div>
    <div class="site-footer__rule" aria-hidden="true"></div>
    <div class="container site-footer__bottom">
      <p>© Faculdade IDE | Mude O Seu Mundo! <span data-footer-year>${new Date().getFullYear()}</span> • Todos os direitos reservados<br>CNPJ: 08.469.669/0001-39 — Instituto de Desenvolvimento Educacional</p>
      <script>(function(){var y=document.querySelector("[data-footer-year]");if(y)y.textContent=String(new Date().getFullYear());})();</script>
      <a class="dev-by" href="https://wa.me/5571991065853?text=Eu%20quero%20um%20site%20para%20minha%20empresa!" target="_blank" rel="noopener noreferrer">Desenvolvido por: <img src="${base}assets/img/Nous-Dynamics-Favicon-01.svg" alt="Nous Dynamics"></a>
    </div>
  </footer>`;
}

export function renderSiteMotionStyles({ base = "" } = {}) {
  return `<link rel="stylesheet" href="${base}assets/css/motion.css">`;
}

export function renderSiteLayoutScripts({ base = "" } = {}) {
  return `<script src="${base}assets/js/site-header-offset.js" defer></script>
  <script src="${base}assets/js/site-nav.js" defer></script>
  <script src="${base}assets/js/site-smooth-scroll.js" defer></script>
  <script src="${base}assets/js/motion.js" defer></script>
  <script src="${base}assets/js/tracking.js" defer></script>`;
}

export function render404Page({
  title = "Página não encontrada — EAD Faculdade IDE",
  heading = "404",
  message = "A página que você procura não existe ou foi movida.",
  base = "/",
} = {}) {
  const assetBase = base.endsWith("/") ? base : `${base}/`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${renderGtmHead()}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="robots" content="noindex, follow">
  <link rel="icon" href="${assetBase}assets/img/FAV-ICON-3.svg" sizes="any">
  <link rel="stylesheet" href="${assetBase}assets/css/tokens.css">
  <link rel="stylesheet" href="${assetBase}assets/css/base.css">
  <link rel="stylesheet" href="${assetBase}assets/css/components.css">
  ${renderSiteMotionStyles({ base: assetBase })}
  <style>
    .not-found {
      flex: 1 0 auto;
      display: grid;
      place-content: center;
      text-align: center;
      padding: 2rem;
      gap: 1rem;
    }
    .not-found h1 { font-size: clamp(2rem, 5vw, 3rem); color: var(--color-primary); }
    .not-found p { color: var(--color-muted); max-width: 40ch; margin: 0 auto; }
  </style>
</head>
<body class="site-layout">
  ${renderGtmBody()}
  ${renderHeader({ base: assetBase, ctaHref: "#inscricao" })}
  <main class="not-found">
    <h1>${heading}</h1>
    <p>${message}</p>
    <a class="btn btn--primary" href="/">Voltar para a home</a>
  </main>
  ${renderFooter({ base: assetBase })}
  ${renderSiteLayoutScripts({ base: assetBase })}
</body>
</html>`;
}
