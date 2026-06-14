/**
 * Renderiza HTML de páginas de pós-graduação — clone fiel do template Elementor (post-13).
 * Referência: _capture/curso.html + assets/css/elementor/post-*.css
 */
const SITE_URL = "https://ead.faculdadeide.edu.br";
const WP_UPLOADS = `${SITE_URL}/wp-content/uploads`;
const GUIDE_IMG = "assets/img/IMG-GUIA-DO-CURSO-01.webp";
const DEFAULT_VIDEO = "https://www.youtube.com/watch?v=XHOmBV4js_E";

const BTN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" fill="none"><path d="M44 22C44 34.1503 34.1503 44 22 44C9.84974 44 0 34.1503 0 22C0 9.84974 9.84974 0 22 0C34.1503 0 44 9.84974 44 22Z" fill="white"></path><path d="M24.5977 16L31 22.4023L24.5977 28.8046" stroke="black" stroke-width="1.30605"></path><line x1="30.4833" y1="22.4209" x2="11.6674" y2="22.4209" stroke="black" stroke-width="1.30605"></line></svg>`;

const CARET_DOWN = `<svg aria-hidden="true" viewBox="0 0 320 512" width="14" height="14" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M143 352.3L7 216.3c-9.4-9.4-9.4-24.6 0-33.9l22.6-22.6c9.4-9.4 24.6-9.4 33.9 0l96.4 96.4 96.4-96.4c9.4-9.4 24.6-9.4 33.9 0l22.6 22.6c9.4 9.4 9.4 24.6 0 33.9l-136 136c-9.2 9.4-24.4 9.4-33.8 0z"/></svg>`;
const CARET_UP = `<svg aria-hidden="true" viewBox="0 0 320 512" width="14" height="14" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M177 159.7l136 136c9.4 9.4 9.4 24.6 0 33.9l-22.6 22.6c-9.4 9.4-24.6 9.4-33.9 0L160 255.9l-96.4 96.4c-9.4 9.4-24.6 9.4-33.9 0L7 329.7c-9.4-9.4-9.4-24.6 0-33.9l136-136c9.4-9.5 24.6-9.5 34-.1z"/></svg>`;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function assetUrl(path, base = "../../") {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${base}${path.replace(/^\//, "")}`;
}

function absUrl(path) {
  if (!path) return SITE_URL;
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}/${path.replace(/^\//, "")}`;
}

function byId(list, id) {
  return list.find((item) => item.id === id) || null;
}

function youtubeEmbed(url) {
  if (!url) return "";
  const match = String(url).trim().match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : "";
}

function statusClass(statusId) {
  const map = {
    "inscricoes-abertas": "status-inscricoes-abertas",
    "pre-inscricao": "status-pre-inscricao",
    "turma-confirmada": "status-turma-confirmada",
    "ultimas-vagas": "status-ultimas-vagas",
  };
  return map[statusId] || "status-inscricoes-abertas";
}

function formatPill(value, fallback) {
  if (!value) return fallback;
  return value.replace(/\b(\d+)\s*horas\b/i, "$1 Horas").replace(/\b(\d+)\s*meses\b/i, "$1 Meses");
}

function renderJsonLd(course, faq) {
  const canonical = course.seo?.canonical || `/pos-graduacao/${course.slug}`;
  const pageUrl = absUrl(canonical);
  const graph = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Pós-Graduação", item: `${SITE_URL}/#cursos` },
        { "@type": "ListItem", position: 3, name: course.titulo, item: pageUrl },
      ],
    },
    {
      "@type": "Course",
      name: course.titulo,
      description: course.seo?.description || course.subtitulo || course.titulo,
      provider: { "@type": "EducationalOrganization", name: "Faculdade IDE", url: `${SITE_URL}/` },
      courseMode: "online",
      educationalLevel: "Pós-Graduação Lato Sensu",
      inLanguage: "pt-BR",
      url: pageUrl,
      image: absUrl(course.imagem_capa),
      offers: {
        "@type": "Offer",
        category: "Pós-Graduação EAD",
        url: course.hero?.link_botao || course.investimento?.link_botao || pageUrl,
      },
    },
  ];
  if (faq?.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.slice(0, 8).map((item) => ({
        "@type": "Question",
        name: item.pergunta,
        acceptedAnswer: { "@type": "Answer", text: item.resposta.replace(/<[^>]+>/g, " ") },
      })),
    });
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2);
}

function renderHeader(base) {
  return `<header class="site-header" id="topo">
    <div class="container site-header__inner">
      <a class="site-header__logo" href="/" aria-label="Faculdade IDE EAD — início">
        <img src="${base}assets/img/LOGO-IDE-ONLINE-02.svg" width="229" height="88" alt="Faculdade IDE EAD">
      </a>
      <nav class="site-nav__menu" aria-label="Menu principal">
        <a href="${SITE_URL}/paginas-de-cursos/">Pós-Graduação</a>
        <span class="site-nav__divider" aria-hidden="true"></span>
        <a href="${SITE_URL}/paginas-de-cursos/">Graduação</a>
        <span class="site-nav__divider" aria-hidden="true"></span>
        <a href="${SITE_URL}/paginas-de-cursos/">Curta Duração</a>
        <span class="site-nav__divider" aria-hidden="true"></span>
        <a href="${SITE_URL}/paginas-de-cursos/">Todos os cursos</a>
      </nav>
      <div class="site-nav__actions">
        <a class="site-header__login" href="https://institutode131845.rm.cloudtotvs.com.br/FrameHTML/web/app/edu/PortalEducacional/login/" target="_blank" rel="noopener">Já sou Aluno(a)</a>
        <a class="site-header__cta" href="#investimento">inscreva-se</a>
      </div>
    </div>
  </header>`;
}

function renderFooter(base) {
  return `<footer class="site-footer">
    <div class="container site-footer__grid">
      <div class="site-footer__col">
        <img class="site-footer__logo" src="${base}assets/img/LOGO-IDE-ONLINE-02.svg" alt="Faculdade IDE EAD">
        <div class="site-footer__block">
          <h3>Políticas</h3>
          <ul>
            <li><a href="${SITE_URL}/?page_id=773">Termos de uso</a></li>
            <li><a href="${SITE_URL}/?page_id=3">Política de privacidade</a></li>
          </ul>
        </div>
        <div class="site-footer__emec">
          <p>Consulte aqui o cadastro da Instituição no Sistema e-MEC</p>
          <img src="${base}assets/img/e-mec-qrcode.png" alt="QR Code e-MEC">
        </div>
      </div>
      <div class="site-footer__col site-footer__col--stack-sm">
        <div class="site-footer__block">
          <h3>Institucional</h3>
          <ul>
            <li><a href="https://www.faculdadeide.edu.br/quem-somos">Quem somos</a></li>
            <li><a href="https://www.faculdadeide.edu.br/biblioteca">Biblioteca</a></li>
          </ul>
        </div>
        <div class="site-footer__block site-footer__block--flush">
          <ul><li><a href="https://www.faculdadeide.edu.br/fale-conosco">Fale conosco</a></li></ul>
        </div>
      </div>
      <div class="site-footer__col">
        <div class="site-footer__block site-footer__block--tight">
          <h3>Nossos escritórios</h3>
          <p>Alferes José Pedro de Brito, 50<br>Farolândia<br>Aracaju/SE</p>
        </div>
        <div class="site-footer__block site-footer__block--tight">
          <h3>Contatos</h3>
          <p class="site-footer__phone"><a href="tel:08000813256">0800 081 3256*</a></p>
          <p class="site-footer__note">* O 0800 só é válido para ligações de telefone fixo, fora de Recife e Região Metropolitana</p>
          <p class="site-footer__phone"><a href="tel:08134650002">(81) 3465-0002</a></p>
        </div>
        <div class="site-footer__block">
          <h3>Redes Social</h3>
          <div class="social">
            <a href="https://www.instagram.com/faculdadeide" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.42.4.68.8.9 1.4.17.4.37 1 .42 2.2.06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.05 1.2-.25 1.8-.42 2.2a3.8 3.8 0 0 1-.9 1.4c-.4.42-.8.68-1.4.9-.4.17-1 .37-2.2.42-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.05-1.8-.25-2.2-.42a3.8 3.8 0 0 1-1.4-.9 3.8 3.8 0 0 1-.9-1.4c-.17-.4-.37-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.05-1.2.25-1.8.42-2.2.22-.6.48-1 .9-1.4.4-.42.8-.68 1.4-.9.4-.17 1-.37 2.2-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 1.8a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Zm5-3.2a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z"/></svg></a>
            <a href="https://www.facebook.com/faculdadeide" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M13.5 21v-8.2h2.8l.42-3.2H13.5V7.5c0-.93.26-1.56 1.6-1.56h1.7V3.1c-.3-.04-1.3-.13-2.48-.13-2.46 0-4.14 1.5-4.14 4.25v2.37H7.4v3.2h2.28V21h3.82Z"/></svg></a>
            <a href="https://twitter.com/faculdadeide" target="_blank" rel="noopener" aria-label="Twitter / X"><svg viewBox="0 0 24 24"><path d="M17.7 3h3.3l-7.2 8.2L22.5 21h-6.6l-5.2-6.8L4.8 21H1.5l7.7-8.8L1.5 3h6.8l4.7 6.2L17.7 3Zm-1.2 16h1.8L7.6 4.9H5.7L16.5 19Z"/></svg></a>
          </div>
        </div>
      </div>
    </div>
    <div class="site-footer__rule" aria-hidden="true"></div>
    <div class="container site-footer__bottom">
      <p>© Faculdade IDE | Mude O Seu Mundo! 2024 • Todos os direitos reservados<br>CNPJ: 08.469.669/0001-39 — Instituto de Desenvolvimento Educacional</p>
      <a class="dev-by" href="https://wa.me/5571991065853?text=Eu%20quero%20um%20site%20para%20minha%20empresa!" target="_blank" rel="noopener">Desenvolvido por: <img src="${base}assets/img/Nous-Dynamics-Favicon-01.svg" alt="Nous Dynamics"></a>
    </div>
  </footer>`;
}

function renderJetAccordion(items, { dark = false, idStart = 1 } = {}) {
  return items
    .map((item, i) => {
      const id = idStart + i;
      const icon = i === 0 && dark
        ? ""
        : `<div class="jet-toggle__label-icon jet-toggle-icon-position-right"><span class="jet-toggle__icon icon-normal jet-tabs-icon">${CARET_DOWN}</span><span class="jet-toggle__icon icon-active jet-tabs-icon">${CARET_UP}</span></div>`;
      const body =
        item.itens?.length
          ? `<ul>${item.itens.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
          : `<p>${escapeHtml(item.resposta || "")}</p>`;
      return `<div class="jet-accordion__item jet-toggle jet-toggle-move-up-effect">
        <div id="jet-toggle-control-${id}" class="jet-toggle__control" role="button" tabindex="0" aria-controls="jet-toggle-content-${id}" aria-expanded="false">
          ${icon}<div class="jet-toggle__label-text">${escapeHtml(item.titulo || item.pergunta)}</div>
        </div>
        <div id="jet-toggle-content-${id}" class="jet-toggle__content" role="region" hidden>
          <div class="jet-toggle__content-inner">${body}</div>
        </div>
      </div>`;
    })
    .join("");
}

function renderCoordCard(coord, base) {
  if (!coord) return "";
  const cvItems = (coord.mini_curriculo || [])
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  return `<div class="elementor elementor-1076">
    <div class="elementor-element elementor-element-c5d4c98 e-con-full e-flex e-con e-parent">
      <div class="elementor-element elementor-element-a42752c elementor-widget elementor-widget-image">
        <div class="elementor-widget-container">
          <img src="${assetUrl(coord.foto, base)}" alt="${escapeHtml(coord.nome)}" loading="lazy">
        </div>
      </div>
      <div class="elementor-element elementor-element-0d094fc e-con-full e-flex e-con e-child">
        <div class="elementor-element elementor-element-88d6812 elementor-widget elementor-widget-heading">
          <div class="elementor-widget-container">
            <h2 class="elementor-heading-title elementor-size-default">${escapeHtml(coord.nome)}</h2>
          </div>
        </div>
        ${
          cvItems
            ? `<details class="e-n-accordion-item">
            <summary class="e-n-accordion-item-title"><span class="e-n-accordion-item-title-text">Mini-currículo</span></summary>
            <div class="elementor-element elementor-element-7b25652 elementor-widget elementor-widget-heading">
              <div class="elementor-widget-container">
                <h2 class="elementor-heading-title elementor-size-default"><ul>${cvItems}</ul></h2>
              </div>
            </div>
          </details>`
            : ""
        }
      </div>
    </div>
  </div>`;
}

function renderProfessorFlip(prof, base) {
  const photo = assetUrl(prof.foto, base);
  const bio = escapeHtml(prof.descricao || prof.titulo || "");
  return `<div class="jet-listing-grid__item">
    <div class="elementor elementor-1141">
      <div class="elementor-element elementor-element-1c93140 e-con-full e-flex e-con e-parent">
        <div class="elementor-element elementor-element-bc8485e elementor-flip-box--effect-fade elementor-widget elementor-widget-flip-box">
          <div class="elementor-widget-container">
            <div class="elementor-flip-box" tabindex="0">
              <div class="elementor-flip-box__layer elementor-flip-box__front" style="background-image:url('${photo}')">
                <div class="elementor-flip-box__layer__overlay">
                  <div class="elementor-flip-box__layer__inner">
                    <h3 class="elementor-flip-box__layer__title">${escapeHtml(prof.nome)}</h3>
                  </div>
                </div>
              </div>
              <div class="elementor-flip-box__layer elementor-flip-box__back">
                <div class="elementor-flip-box__layer__overlay">
                  <div class="elementor-flip-box__layer__inner">
                    <h3 class="elementor-flip-box__layer__title">${escapeHtml(prof.nome)}</h3>
                    ${bio ? `<div class="elementor-flip-box__layer__description">${bio}</div>` : ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

export function renderCoursePage(course, ctx) {
  const base = "../../";
  const info = course.informacoes || {};
  const hero = course.hero || {};
  const inv = course.investimento || {};
  const seo = course.seo || {};
  const canonical = seo.canonical || `/pos-graduacao/${course.slug}`;
  const pageUrl = absUrl(canonical);
  const ogImage = absUrl(course.imagem_capa);
  const status = byId(ctx.statuses, course.status_curso_id);
  const statusLabel = status?.nome || "Inscrições Abertas";
  const statusCss = statusClass(course.status_curso_id || status?.id);
  const inscricaoLink = hero.link_botao || inv.link_botao || "#investimento";
  const coverImg = assetUrl(course.imagem_capa, base);
  const embed = youtubeEmbed(info.video || DEFAULT_VIDEO);

  const pill1 = formatPill(info.carga_horaria, "360 Horas");
  const pill2 = formatPill(info.duracao, "12 Meses");
  const pill3 = info.modalidade?.includes("EAD") || info.modalidade?.includes("Online") ? "Online" : info.modalidade || "Online";

  const infobar = [
    info.inicio_previsto && {
      icon: `${base}assets/img/MaterialSymbolsLightEventNoteRounded.svg`,
      label: `Início previsto ${info.inicio_previsto}`,
      wide: false,
    },
    info.aulas && {
      icon: `${WP_UPLOADS}/2024/08/SolarPlayStreamBold.svg`,
      label: info.aulas,
      wide: false,
    },
    { icon: `${WP_UPLOADS}/2024/08/MaterialSymbolsTouchTripleRounded.svg`, label: "Plataforma interativa", wide: false },
    { icon: `${WP_UPLOADS}/2024/08/e-mec.webp`, label: "Reconhecido pelo e-MEC", wide: true },
  ].filter(Boolean);

  const coords = (course.coordenacao_ids || []).map((id) => byId(ctx.coordination, id)).filter(Boolean);
  const coordCard = coords[0] ? renderCoordCard(coords[0], base) : "";

  const modulos = course.modulos || [];
  const audience = (course.publico_alvo || []).filter((item) => item?.texto);

  const professors = (course.professor_ids || [])
    .map((id) => byId(ctx.professors, id))
    .filter(Boolean);

  const testimonials = (course.depoimento_ids || [])
    .map((id) => byId(ctx.testimonials, id))
    .filter(Boolean);

  const related = ctx.courses
    .filter((c) => c.id !== course.id && c.publicado !== false)
    .slice(0, 4);

  const infobarHtml = infobar
    .map((item, idx) => {
      const dividers = ["553c2f4", "d5c58bc", "8859ee4"];
      const divider = idx > 0 ? `<div class="elementor-element elementor-element-${dividers[idx - 1]} e-con-full e-flex e-con e-child"></div>` : "";
      const ids = ["bd1680a", "63840b1", "7b903f9", "8de6b8f"];
      const imgW = item.wide ? 82 : 32;
      return `${divider}
        <div class="elementor-element elementor-element-${ids[idx]} elementor-widget__width-initial elementor-position-top elementor-widget elementor-widget-image-box">
          <div class="elementor-widget-container">
            <div class="elementor-image-box-wrapper">
              <figure class="elementor-image-box-img"><img width="${imgW}" height="32" src="${item.icon}" alt=""></figure>
              <div class="elementor-image-box-content"><div class="elementor-image-box-title">${escapeHtml(item.label)}</div></div>
            </div>
          </div>
        </div>`;
    })
    .join("");

  const audienceHtml = audience
    .map((item, idx) => {
      const ids = ["a729781", "e3dd28f", "ea4d595", "a9770f4"];
      return `<div class="elementor-element elementor-element-${ids[idx] || "a729781"} elementor-widget__width-initial elementor-widget elementor-widget-image-box">
        <div class="elementor-widget-container">
          <div class="elementor-image-box-wrapper"><div class="elementor-image-box-content"><p class="elementor-image-box-description">${escapeHtml(item.texto)}</p></div></div>
        </div>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(seo.title || `${course.titulo} | Pós-Graduação EAD — Faculdade IDE`)}</title>
  <meta name="description" content="${escapeHtml(seo.description || course.subtitulo || "")}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <link rel="canonical" href="${pageUrl}">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Ead Faculdade IDE">
  <meta property="og:title" content="${escapeHtml(seo.og_title || seo.title || course.titulo)}">
  <meta property="og:description" content="${escapeHtml(seo.og_description || seo.description || "")}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(seo.title || course.titulo)}">
  <meta name="twitter:description" content="${escapeHtml(seo.description || "")}">
  <meta name="twitter:image" content="${ogImage}">
  <link rel="icon" href="${base}assets/img/FAV-ICON-3.svg" sizes="any">
  <script type="application/ld+json">${renderJsonLd(course, course.faq)}</script>
  <link rel="stylesheet" href="https://ead.faculdadeide.edu.br/wp-content/plugins/elementor/assets/css/frontend.min.css">
  <link rel="stylesheet" href="${base}assets/css/elementor/post-5.css">
  <link rel="stylesheet" href="${base}assets/css/elementor/post-13.css">
  <link rel="stylesheet" href="${base}assets/css/elementor/post-1076.css">
  <link rel="stylesheet" href="${base}assets/css/elementor/post-1141.css">
  <link rel="stylesheet" href="${base}assets/css/elementor/overrides.css">
  <link rel="stylesheet" href="${base}assets/css/tokens.css">
  <link rel="stylesheet" href="${base}assets/css/base.css">
  <link rel="stylesheet" href="${base}assets/css/components.css">
</head>
<body class="elementor-default elementor-kit-5 elementor-page-13">
  ${renderHeader(base)}
  <main id="content">
    <div class="elementor elementor-13">
      <!-- HERO -->
      <div class="elementor-element elementor-element-9072d3c e-flex e-con-boxed e-con e-parent">
        <div class="e-con-inner">
          <div class="elementor-element elementor-element-fb93f95 e-con-full e-flex e-con e-child">
            <div class="elementor-element elementor-element-76b7803 elementor-widget elementor-widget-heading">
              <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">Pós-Graduação</h2></div>
            </div>
            <div class="elementor-element elementor-element-5ea481a elementor-widget elementor-widget-image-box">
              <div class="elementor-widget-container">
                <div class="elementor-image-box-wrapper">
                  <div class="elementor-image-box-content">
                    <div class="elementor-image-box-title">${escapeHtml(course.titulo)}</div>
                    ${course.subtitulo ? `<p class="elementor-image-box-description">${escapeHtml(course.subtitulo.replace(/\.$/, ""))}</p>` : ""}
                  </div>
                </div>
              </div>
            </div>
            <div class="elementor-element elementor-element-1363c47 e-con-full e-flex e-con e-child">
              <div class="elementor-element elementor-element-998e39a elementor-widget elementor-widget-image-box">
                <div class="elementor-widget-container"><div class="elementor-image-box-wrapper"><div class="elementor-image-box-content"><div class="elementor-image-box-title">${escapeHtml(pill1)}</div></div></div></div>
              </div>
              <div class="elementor-element elementor-element-3b23976 e-con-full e-flex e-con e-child"></div>
              <div class="elementor-element elementor-element-c395dcc elementor-widget elementor-widget-image-box">
                <div class="elementor-widget-container"><div class="elementor-image-box-wrapper"><div class="elementor-image-box-content"><div class="elementor-image-box-title">${escapeHtml(pill2)}</div></div></div></div>
              </div>
              <div class="elementor-element elementor-element-cdc5b26 e-con-full e-flex e-con e-child"></div>
              <div class="elementor-element elementor-element-f39655f elementor-widget elementor-widget-image-box">
                <div class="elementor-widget-container"><div class="elementor-image-box-wrapper"><div class="elementor-image-box-content"><div class="elementor-image-box-title">${escapeHtml(pill3)}</div></div></div></div>
              </div>
            </div>
            <div class="elementor-element elementor-element-59d36ac e-con-full e-flex e-con e-child">
              <div class="elementor-element elementor-element-0e95694 elementor-align-justify hovers elementor-widget elementor-widget-button">
                <div class="elementor-widget-container">
                  <div class="elementor-button-wrapper">
                    <a class="elementor-button elementor-button-link elementor-size-sm" href="${escapeHtml(inscricaoLink)}" target="_blank" rel="noopener">
                      <span class="elementor-button-content-wrapper">
                        <span class="elementor-button-icon">${BTN_ICON}</span>
                        <span class="elementor-button-text">${escapeHtml(hero.texto_botao || "Inscreva-se")}</span>
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="elementor-element elementor-element-9396dd8 e-con-full e-flex e-con e-child" style="background-image:url('${coverImg}')">
            <div class="elementor-element elementor-element-a31ecec meu-status-dinamico ${statusCss} elementor-widget elementor-widget-heading">
              <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">${escapeHtml(statusLabel)}</h2></div>
            </div>
          </div>
        </div>
      </div>

      <!-- INFO BAR -->
      <div class="elementor-element elementor-element-4ff9f4f e-flex e-con-boxed e-con e-child">
        <div class="e-con-inner">${infobarHtml}</div>
      </div>

      <!-- CONHEÇA O CURSO -->
      <div class="elementor-element elementor-element-6cba087 e-flex e-con-boxed e-con e-parent">
        <div class="e-con-inner">
          <div class="elementor-element elementor-element-fb22a49 e-con-full e-flex e-con e-child">
            <div class="elementor-element elementor-element-c52218a elementor-widget elementor-widget-heading">
              <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">Conheça o curso</h2></div>
            </div>
            ${
              embed
                ? `<div class="elementor-element elementor-element-0f00e66 elementor-widget elementor-widget-video">
              <div class="elementor-widget-container">
                <div class="elementor-wrapper elementor-open-inline">
                  <iframe class="elementor-video" src="${embed}" title="Vídeo promocional — ${escapeHtml(course.titulo)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" style="width:100%;aspect-ratio:16/9;border:0;border-radius:32px;"></iframe>
                </div>
              </div>
            </div>`
                : ""
            }
          </div>
          ${
            coordCard
              ? `<div class="elementor-element elementor-element-92d888b e-con-full e-flex e-con e-child">
            <div class="elementor-element elementor-element-7529a1d elementor-widget__width-inherit elementor-widget elementor-widget-jet-listing-grid">
              <div class="elementor-widget-container"><div class="jet-listing-grid jet-listing"><div class="jet-listing-grid__items">${coordCard}</div></div></div>
            </div>
          </div>`
              : ""
          }
        </div>
      </div>

      <!-- PROGRAMA (módulos + guia + público) -->
      <div class="elementor-element elementor-element-ad3d8d1 e-con-full e-flex e-con e-parent">
        ${
          modulos.length
            ? `<div class="elementor-element elementor-element-2f21298 e-flex e-con-boxed e-con e-child">
          <div class="e-con-inner">
            <div class="elementor-element elementor-element-e523a03 elementor-widget elementor-widget-heading">
              <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">O que você vai aprender:</h2></div>
            </div>
            <div class="elementor-element elementor-element-e036d55 e-con-full e-flex e-con e-child">
              <div class="elementor-element elementor-element-bc314b7 elementor-widget elementor-widget-jet-accordion">
                <div class="elementor-widget-container">
                  <div class="jet-accordion"><div class="jet-accordion__inner">${renderJetAccordion(modulos, { dark: true })}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>`
            : ""
        }

        <div class="elementor-element elementor-element-47f27a3 e-con-full e-flex e-con e-child">
          <div class="elementor-element elementor-element-d3e2afa e-flex e-con-boxed e-con e-child">
            <div class="e-con-inner">
              <div class="elementor-element elementor-element-c50d4f8 e-con-full e-flex e-con e-child">
                <div class="elementor-element elementor-element-f0f6d81 elementor-widget elementor-widget-heading">
                  <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">Baixe o guia do seu curso e entenda tudo sobre ele</h2></div>
                </div>
                <div class="elementor-element elementor-element-0d18598 elementor-widget elementor-widget-image">
                  <div class="elementor-widget-container"><img width="44" height="44" src="${base}assets/img/ICON-BUT-V1.svg" alt=""></div>
                </div>
              </div>
              <div class="elementor-element elementor-element-734d6f2 elementor-widget elementor-widget-image">
                <div class="elementor-widget-container"><img src="${assetUrl(GUIDE_IMG, base)}" alt="Guia do curso no celular" loading="lazy"></div>
              </div>
            </div>
          </div>
        </div>

        ${
          audience.length
            ? `<div class="elementor-element elementor-element-a0cfd63 e-flex e-con-boxed e-con e-child">
          <div class="e-con-inner">
            <div class="elementor-element elementor-element-91e294f elementor-widget elementor-widget-heading">
              <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">Esse curso é para quem:</h2></div>
            </div>
            <div class="elementor-element elementor-element-3c74301 e-con-full e-flex e-con e-child">${audienceHtml}</div>
          </div>
        </div>`
            : ""
        }
      </div>

      ${
        professors.length
          ? `<div class="elementor-element elementor-element-ede1902 e-flex e-con-boxed e-con e-parent">
        <div class="e-con-inner">
          <div class="elementor-element elementor-element-c53b967 e-con-full e-flex e-con e-child">
            <div class="elementor-element elementor-element-7f9398a elementor-widget elementor-widget-heading">
              <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">Conheça os professores que são referência</h2></div>
            </div>
            <div class="elementor-element elementor-element-2941832 elementor-widget elementor-widget-image">
              <div class="elementor-widget-container"><img width="44" height="44" src="${base}assets/img/ICON-BUT-V1.svg" alt=""></div>
            </div>
          </div>
          <div class="elementor-element elementor-element-c600f96 professores elementor-widget__width-inherit elementor-widget elementor-widget-jet-listing-grid">
            <div class="elementor-widget-container">
              <div class="jet-listing-grid jet-listing"><div class="jet-listing-grid__items">${professors.map((p) => renderProfessorFlip(p, base)).join("")}</div></div>
            </div>
          </div>
        </div>
      </div>`
          : ""
      }

      ${
        testimonials.length
          ? `<div class="elementor-element elementor-element-55eefa2 e-flex e-con-boxed e-con e-parent">
        <div class="e-con-inner">
          <div class="elementor-element elementor-element-6a28cb7 elementor-widget elementor-widget-heading">
            <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">O que nossos alunos dizem</h2></div>
          </div>
          ${testimonials
            .map(
              (dep) => `<div class="elementor-element elementor-element-0df9a46 elementor-widget elementor-widget-jet-listing-grid">
            <div class="elementor-widget-container">
              <div class="jet-listing-grid jet-listing"><div class="jet-listing-grid__items">
                <div class="jet-listing-grid__item">
                  <div class="elementor elementor-1567">
                    <div class="elementor-element elementor-element-6b816b8 e-con-full e-flex e-con e-parent">
                      <div class="elementor-element elementor-element-83bd929 e-con-full e-flex e-con e-child">
                        <div class="elementor-element elementor-element-2558536 elementor-widget elementor-widget-heading"><div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">${escapeHtml(dep.nome)}</h2></div></div>
                        <div class="elementor-element elementor-element-c9a8ffe elementor-widget elementor-widget-heading"><div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">${escapeHtml(dep.profissao || dep.legenda || "")}</h2></div></div>
                      </div>
                      <div class="elementor-element elementor-element-980275a elementor-widget elementor-widget-heading"><div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">${escapeHtml(dep.texto || dep.legenda || "")}</h2></div></div>
                    </div>
                  </div>
                </div>
              </div></div>
            </div>
          </div>`,
            )
            .join("")}
        </div>
      </div>`
          : ""
      }

      <!-- INVESTIMENTO -->
      <div class="elementor-element elementor-element-da640a5 e-flex e-con-boxed e-con e-parent" id="investimento">
        <div class="e-con-inner">
          <div class="elementor-element elementor-element-5f1a26f e-con-full e-flex e-con e-child">
            <div class="elementor-element elementor-element-e50b80c e-con-full e-flex e-con e-child">
              <div class="elementor-element elementor-element-6f4509a elementor-widget elementor-widget-image">
                <div class="elementor-widget-container"><img width="138" height="138" src="${WP_UPLOADS}/2024/08/SELO-VD-IDE-V2.svg" alt=""></div>
              </div>
              <div class="elementor-element elementor-element-f0e0c04 elementor-widget elementor-widget-heading">
                <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">Com esse investimento, você garante:</h2></div>
              </div>
              <div class="elementor-element elementor-element-d0ac64b elementor-widget elementor-widget-heading">
                <div class="elementor-widget-container">
                  <div class="elementor-heading-title elementor-size-default"><ul>${(inv.beneficios || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul></div>
                </div>
              </div>
              <div class="elementor-element elementor-element-d944fc6 hovers elementor-widget elementor-widget-button">
                <div class="elementor-widget-container">
                  <div class="elementor-button-wrapper">
                    <a class="elementor-button elementor-button-link elementor-size-sm" href="${escapeHtml(inv.link_botao || inscricaoLink)}" target="_blank" rel="noopener">
                      <span class="elementor-button-content-wrapper">
                        <span class="elementor-button-icon">${BTN_ICON}</span>
                        <span class="elementor-button-text">${escapeHtml(inv.texto_botao || "Adquira")}</span>
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div class="elementor-element elementor-element-e454f78 e-con-full e-flex e-con e-child">
              <div class="elementor-element elementor-element-741c6ef elementor-widget elementor-widget-icon-box">
                <div class="elementor-widget-container">
                  <div class="elementor-icon-box-wrapper">
                    <div class="elementor-icon-box-content"><div class="elementor-icon-box-title"><span>${escapeHtml(inv.oferta_label || "Oferta de Lançamento")}</span></div></div>
                  </div>
                </div>
              </div>
              <div class="elementor-element elementor-element-9aadfc1 investiment elementor-widget elementor-widget-heading">
                <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default"><p>${escapeHtml(inv.oferta_valor || "")}</p>${inv.taxa_inscricao ? `<p><em>${escapeHtml(inv.taxa_inscricao)}</em></p>` : ""}</h2></div>
              </div>
              <div class="elementor-element elementor-element-14a41fb elementor-widget elementor-widget-heading">
                <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default"><a href="#">Confira outras opções de parcelamento.</a></h2></div>
              </div>
              <div class="elementor-element elementor-element-4484468 elementor-widget elementor-widget-heading">
                <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default"><a href="${WP_UPLOADS}/2026/06/Tabela-de-Convenios-e-Descontos.pdf">Confira descontos especiais.</a></h2></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      ${
        course.faq?.length
          ? `<div class="elementor-element elementor-element-3f9b093 e-flex e-con-boxed e-con e-parent">
        <div class="e-con-inner">
          <div class="elementor-element elementor-element-6a2dda1 elementor-widget elementor-widget-heading">
            <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">FAQ - Perguntas Frequentes</h2></div>
          </div>
          <div class="elementor-element elementor-element-98d8a99 elementor-widget elementor-widget-jet-accordion">
            <div class="elementor-widget-container">
              <div class="jet-accordion"><div class="jet-accordion__inner">${renderJetAccordion(course.faq, { idStart: 100 })}</div></div>
            </div>
          </div>
        </div>
      </div>`
          : ""
      }

      ${
        related.length
          ? `<div class="elementor-element elementor-element-a0a2a2a e-flex e-con-boxed e-con e-parent">
        <div class="e-con-inner">
          <div class="elementor-element elementor-element-1db8dfa e-con-full e-flex e-con e-child">
            <div class="elementor-element elementor-element-8fd3b26 elementor-widget elementor-widget-heading">
              <div class="elementor-widget-container"><h2 class="elementor-heading-title elementor-size-default">Cursos que você pode se interessar:</h2></div>
            </div>
            <div class="elementor-element elementor-element-3146654 elementor-widget elementor-widget-jet-listing-grid">
              <div class="elementor-widget-container">
                <div class="jet-listing-grid jet-listing"><div class="jet-listing-grid__items" style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
                  ${related
                    .map((rel) => {
                      const relPath = rel.seo?.canonical || `/pos-graduacao/${rel.slug}`;
                      return `<article style="border:1px solid #D3D3D3;border-radius:12px;overflow:hidden;background:#fff;">
                        <img src="${assetUrl(rel.imagem_capa, base)}" alt="${escapeHtml(rel.titulo)}" style="width:100%;aspect-ratio:4/3;object-fit:cover;" loading="lazy">
                        <div style="padding:1rem;">
                          <p style="font-size:.75rem;text-transform:uppercase;color:#13A6B4;margin:0 0 .5rem;">Pós-Graduação</p>
                          <h3 style="font-size:1rem;margin:0 0 1rem;color:#2B325C;">${escapeHtml(rel.titulo)}</h3>
                          <a href="${escapeHtml(relPath.startsWith("/") ? relPath : `/${relPath}`)}" style="color:#13A6B4;font-weight:500;text-decoration:none;">Conhecer o curso →</a>
                        </div>
                      </article>`;
                    })
                    .join("")}
                </div></div>
              </div>
            </div>
            <div class="elementor-element elementor-element-4eb00de elementor-widget elementor-widget-button">
              <div class="elementor-widget-container">
                <div class="elementor-button-wrapper">
                  <a class="elementor-button elementor-button-link elementor-size-sm" href="/#cursos">
                    <span class="elementor-button-content-wrapper">
                      <span class="elementor-button-icon">${BTN_ICON}</span>
                      <span class="elementor-button-text">Veja mais opções</span>
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`
          : ""
      }
    </div>
  </main>
  ${renderFooter(base)}
  <script src="${base}assets/js/course-page.js" defer></script>
</body>
</html>`;
}
