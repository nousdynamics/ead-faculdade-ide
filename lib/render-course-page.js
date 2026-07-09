/**
 * Renderiza HTML de páginas de pós-graduação — clone fiel do template Elementor (post-13).
 * Referência: _capture/curso.html + assets/css/elementor/post-*.css
 */
import { renderTestimonialsSection } from "./testimonial-templates.js";
import {
  renderFooter,
  renderGtmBody,
  renderGtmHead,
  renderHeader,
  renderSiteLayoutScripts,
  renderSiteMotionStyles,
} from "./site-layout.js";
import { resolveAssetUrl, toMediaUrl } from "./media-url.js";
import { parseRdEmbedCode, hasConfiguredRdEmbed } from "./rd-form-embed.js";
import { createRequire } from "node:module";

const siteConfig = createRequire(import.meta.url)("../data/site.json");

const SITE_URL = "https://ead.faculdadeide.edu.br";
const WP_UPLOADS = `${SITE_URL}/wp-content/uploads`;
const CHECK_BULLET_URL = `${WP_UPLOADS}/2025/10/ICON-CHECKK-BOLLET-01.svg`;
const DISCOUNTS_PDF = `${WP_UPLOADS}/2026/06/Tabela-de-Convenios-e-Descontos.pdf`;
const SELO_VD_URL = `${WP_UPLOADS}/2024/08/SELO-VD-IDE-V2.svg`;
const BTN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44" fill="none"><path d="M44 22C44 34.1503 34.1503 44 22 44C9.84974 44 0 34.1503 0 22C0 9.84974 9.84974 0 22 0C34.1503 0 44 9.84974 44 22Z" fill="white"></path><path d="M24.5977 16L31 22.4023L24.5977 28.8046" stroke="black" stroke-width="1.30605"></path><line x1="30.4833" y1="22.4209" x2="11.6674" y2="22.4209" stroke="black" stroke-width="1.30605"></line></svg>`;

const MINI_CV_CHEVRON = `<svg class="coord-mini-cv__chevron" aria-hidden="true" viewBox="0 0 320 512" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M143 352.3L7 216.3c-9.4-9.4-9.4-24.6 0-33.9l22.6-22.6c9.4-9.4 24.6-9.4 33.9 0l96.4 96.4 96.4-96.4c9.4-9.4 24.6-9.4 33.9 0l22.6 22.6c9.4 9.4 9.4 24.6 0 33.9l-136 136c-9.2 9.4-24.4 9.4-33.8 0z"/></svg>`;

const FAQ_CHEVRON = `<svg class="course-faq__chevron" aria-hidden="true" viewBox="0 0 320 512" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M143 352.3L7 216.3c-9.4-9.4-9.4-24.6 0-33.9l22.6-22.6c9.4-9.4 24.6-9.4 33.9 0l96.4 96.4 96.4-96.4c9.4-9.4 24.6-9.4 33.9 0l22.6 22.6c9.4 9.4 9.4 24.6 0 33.9l-136 136c-9.2 9.4-24.4 9.4-33.8 0z"/></svg>`;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Destaca a partir do "R$" (ex.: 24x de <span>R$ 277,08</span>). */
function formatPriceWithHighlight(value, { highlightClass = "course-investment__price-highlight" } = {}) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const currencyMatch = text.match(/R\s*\$/i);
  const idx = currencyMatch ? currencyMatch.index : -1;
  if (idx === -1) return escapeHtml(text);

  const prefix = text.slice(0, idx).trimEnd();
  const highlight = text.slice(idx).trimStart();
  if (!highlight) return escapeHtml(text);

  const marked = `<span class="${highlightClass}">${escapeHtml(highlight)}</span>`;
  return prefix ? `${escapeHtml(prefix)} ${marked}` : marked;
}

function assetUrl(path, base = "../../") {
  return resolveAssetUrl(path, { base });
}

function renderComplementBanner(course, base) {
  const sc = course.secao_complementar || {};
  const img = sc.imagem?.trim();
  if (!img) return "";

  const mobileImg = sc.imagem_mobile?.trim();
  const contido = sc.formato === "contido";
  const margem = Number.isFinite(Number(sc.margem)) && sc.margem !== "" && sc.margem !== undefined
    ? Number(sc.margem)
    : 0;

  const sourceMobile = mobileImg
    ? `<source media="(max-width: 767px)" srcset="${assetUrl(mobileImg, base)}">`
    : "";

  const classes = [
    "course-complement-banner",
    contido ? "course-complement-banner--contido" : "",
    mobileImg ? "course-complement-banner--custom-mobile" : "",
  ].filter(Boolean).join(" ");

  return `<section class="${classes}" aria-label="Banner complementar" style="--banner-margin:${margem}px">
    <picture>
      ${sourceMobile}
      <img class="course-complement-banner__img" src="${assetUrl(img, base)}" alt="" loading="lazy" width="2560" height="360">
    </picture>
  </section>`;
}

function renderGuideSection(course, base) {
  const customImg = course.guia?.imagem?.trim();
  const guideImg = customImg
    ? assetUrl(customImg, base)
    : `${base}assets/img/IMG-GUIA-DO-CURSO-01.webp`;

  const forms = course.formularios || {};
  const guide = parseRdEmbedCode(forms.guia_embed);

  // Formulário exposto na própria seção (sem popup) quando há embed configurado.
  const formCard = guide.formId
    ? `<div class="course-guide__form" data-rd-inline-form data-rd-form-id="${escapeHtml(guide.formId)}">
          <h3 class="course-guide__form-title">${escapeHtml(forms.guia_titulo || "Baixe o guia do curso")}</h3>
          <p class="course-guide__form-subtitle">${escapeHtml(forms.guia_subtitulo || "Preencha seus dados para receber o material.")}</p>
          ${guide.mountHtml}
        </div>`
    : `<button
          type="button"
          class="course-guide__cta hovers"
          data-open-guide-modal
        >
          <span class="course-guide__cta-icon">${BTN_ICON}</span>
          <span class="course-guide__cta-text">Baixar agora</span>
        </button>`;

  return `<section class="course-guide" id="guia-do-curso">
    <div class="container course-guide__inner${guide.formId ? " course-guide__inner--form" : ""}">
      <div class="course-guide__text">
        <h2>Baixe o guia do seu curso e entenda tudo sobre ele</h2>
        ${formCard}
      </div>
      <div class="course-guide__media">
        <img src="${guideImg}" alt="Guia do curso no celular" loading="lazy" width="488" height="638">
      </div>
    </div>
  </section>`;
}

function renderInvestmentCta(inv, inscricaoLink, { useModal = false } = {}) {
  const ctaText = escapeHtml(inv.texto_botao || "Adquira");
  const inner = `<span class="course-investment__cta-icon">${BTN_ICON}</span><span class="course-investment__cta-text">${ctaText}</span>`;

  if (useModal) {
    return `<button type="button" class="course-investment__cta hovers" data-open-investment-modal>${inner}</button>`;
  }

  const ctaHref = escapeHtml(inv.link_botao || inscricaoLink);
  return `<a class="course-investment__cta hovers" href="${ctaHref}" target="_blank" rel="noopener">${inner}</a>`;
}

function renderRdFormModal({
  id,
  title,
  subtitle,
  formId,
  mountHtml,
  emptyMessage = "Formulário indisponível no momento.",
}) {
  const body = formId
    ? `<div class="course-rd-modal__embed">${mountHtml}</div>`
    : `<p class="course-rd-modal__empty">${escapeHtml(emptyMessage)}</p>`;

  return `<dialog
    class="course-rd-modal"
    id="${escapeHtml(id)}"
    aria-labelledby="${escapeHtml(id)}-title"
    data-rd-form-id="${escapeHtml(formId)}"
  >
    <div class="course-rd-modal__panel">
      <button type="button" class="course-rd-modal__close" aria-label="Fechar formulário">
        <span aria-hidden="true">&times;</span>
      </button>
      <h2 id="${escapeHtml(id)}-title" class="course-rd-modal__title">${escapeHtml(title)}</h2>
      ${subtitle ? `<p class="course-rd-modal__subtitle">${escapeHtml(subtitle)}</p>` : ""}
      ${body}
    </div>
  </dialog>`;
}

function renderCourseFormModals(course) {
  const forms = course.formularios || {};
  const guide = parseRdEmbedCode(forms.guia_embed);
  const investment = parseRdEmbedCode(forms.investimento_embed);
  const modals = [];

  // Com embed configurado, o formulário do guia fica exposto na seção
  // (renderGuideSection) — o modal só existe como aviso quando não há embed.
  if (!guide.formId) {
    modals.push(
      renderRdFormModal({
        id: "course-guide-modal",
        title: forms.guia_titulo || "Baixe o guia do curso",
        subtitle: forms.guia_subtitulo || "Preencha seus dados para receber o material.",
        formId: "",
        mountHtml: "",
        emptyMessage: "Configure o formulário RD Station deste curso no painel admin.",
      }),
    );
  }

  modals.push(
    renderRdFormModal({
      id: "course-investment-modal",
      title: forms.investimento_titulo || "Garanta sua vaga",
      subtitle: "",
      formId: investment.formId,
      mountHtml: investment.mountHtml,
      emptyMessage: "Configure o formulário RD Station deste curso no painel admin.",
    }),
  );

  return modals.join("\n  ");
}

function absUrl(path) {
  if (!path) return SITE_URL;
  if (/^https?:\/\//.test(path)) return path;
  return resolveAssetUrl(path, { absolute: true });
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
        { "@type": "ListItem", position: 2, name: "Pós-Graduação", item: `${SITE_URL}/paginas-de-cursos/pos-graduacao` },
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

function renderModulesGrid(modulos) {
  return modulos
    .map((mod, index) => {
      const body = mod.itens?.length
        ? `<ul class="course-modules__list">${mod.itens
            .map(
              (line, itemIndex) =>
                `<li class="course-modules__item">
          <span class="course-modules__item-index" aria-hidden="true">${String(itemIndex + 1).padStart(2, "0")}</span>
          <span class="course-modules__item-text">${escapeHtml(line)}</span>
        </li>`,
            )
            .join("")}</ul>`
        : mod.resposta
          ? `<p class="course-modules__text">${escapeHtml(mod.resposta)}</p>`
          : "";
      return `<article class="course-modules__card">
        <header class="course-modules__head">
          <h3 class="course-modules__title">${escapeHtml(mod.titulo || `Módulo ${index + 1}`)}</h3>
        </header>
        <div class="course-modules__body">${body}</div>
      </article>`;
    })
    .join("");
}

function renderModulesSection(modulos) {
  if (!modulos?.length) return "";

  return `<section class="course-modules-section" aria-labelledby="course-modules-title">
    <div class="course-modules-section__inner">
      <h2 id="course-modules-title" class="course-modules-section__title">O que você vai aprender:</h2>
      <div class="course-modules">${renderModulesGrid(modulos)}</div>
    </div>
  </section>`;
}

function renderFaqSection(faq) {
  if (!faq?.length) return "";

  const items = faq
    .map((item) => {
      const pergunta = escapeHtml(item.pergunta || item.titulo || "");
      const resposta = escapeHtml(item.resposta || "");
      if (!pergunta) return "";
      return `<details class="course-faq__item">
        <summary class="course-faq__question">
          <span class="course-faq__icon">${FAQ_CHEVRON}</span>
          <span class="course-faq__question-text">${pergunta}</span>
        </summary>
        <div class="course-faq__panel">
          <div class="course-faq__panel-inner">
            <div class="course-faq__answer"><p>${resposta}</p></div>
          </div>
        </div>
      </details>`;
    })
    .filter(Boolean)
    .join("");

  if (!items) return "";

  return `<section class="course-faq" aria-labelledby="course-faq-title">
    <div class="course-faq__inner">
      <h2 id="course-faq-title" class="course-faq__title">FAQ - Perguntas Frequentes</h2>
      <div class="course-faq__list">${items}</div>
    </div>
  </section>`;
}

function renderInstallmentsModal(opcoes) {
  if (!opcoes?.length) return "";

  const items = opcoes
    .map((op) => {
      const descricao = escapeHtml(op.descricao || "");
      const valor = String(op.valor || "").trim();
      const valorHtml = valor
        ? formatPriceWithHighlight(valor, { highlightClass: "course-installments-modal__value" })
        : "";
      const desconto = op.desconto
        ? `<span class="course-installments-modal__discount">(${escapeHtml(op.desconto)})</span>`
        : "";
      if (!descricao && !valor) return "";
      return `<li class="course-installments-modal__option">
        ${descricao ? `<p class="course-installments-modal__label">${descricao}</p>` : ""}
        ${valorHtml ? `<p class="course-installments-modal__price">${valorHtml}</p>` : ""}
        ${desconto}
      </li>`;
    })
    .filter(Boolean)
    .join("");

  if (!items) return "";

  return `<dialog class="course-installments-modal" id="course-installments-modal" aria-labelledby="course-installments-modal-title">
    <div class="course-installments-modal__panel">
      <button type="button" class="course-installments-modal__close" aria-label="Fechar opções de parcelamento">
        <span aria-hidden="true">&times;</span>
      </button>
      <h2 id="course-installments-modal-title" class="course-installments-modal__title">Opções de parcelamento</h2>
      <ul class="course-installments-modal__grid">${items}</ul>
    </div>
  </dialog>`;
}

function renderInvestmentSection(inv, inscricaoLink, base, formularios = {}) {
  const beneficios = (inv.beneficios || []).filter(Boolean);
  const opcoesParcelamento = (inv.opcoes_parcelamento || []).filter(
    (op) => op?.descricao?.trim() || op?.valor?.trim(),
  );
  if (!beneficios.length && !inv.oferta_valor) return "";

  const investmentEmbedRaw = String(formularios.investimento_embed || "").trim();
  const useInvestmentModal = hasConfiguredRdEmbed(investmentEmbedRaw);
  const pdfDescontos = String(inv.pdf_descontos || DISCOUNTS_PDF).trim();
  const pdfHref = escapeHtml(assetUrl(pdfDescontos, base));
  const listHtml = beneficios
    .map((b) => `<li>${escapeHtml(b)}</li>`)
    .join("");

  return `<section class="course-investment" id="investimento" style="--course-investment-check-icon:url('${CHECK_BULLET_URL}')">
    <div class="course-investment__inner">
      <div class="course-investment__benefits">
        <div class="course-investment__seal">
          <img src="${SELO_VD_URL}" width="138" height="138" alt="" loading="lazy">
        </div>
        <h2 class="course-investment__title">Com esse investimento, você garante:</h2>
        ${listHtml ? `<ul class="course-investment__list">${listHtml}</ul>` : ""}
        ${renderInvestmentCta(inv, inscricaoLink, { useModal: useInvestmentModal })}
      </div>
      <div class="course-investment__pricing">
        <span class="course-investment__badge">${escapeHtml(inv.oferta_label || "Oferta de lançamento")}</span>
        ${inv.oferta_valor ? `<p class="course-investment__price">${formatPriceWithHighlight(inv.oferta_valor)}</p>` : ""}
        ${inv.taxa_inscricao ? `<p class="course-investment__fee">${formatPriceWithHighlight(inv.taxa_inscricao, { highlightClass: "course-investment__fee-highlight" })}</p>` : ""}
        <div class="course-investment__links">
          ${
            opcoesParcelamento.length
              ? `<button type="button" class="course-investment__link-btn" data-open-installments>Confira outras opções de parcelamento.</button>`
              : ""
          }
          ${pdfDescontos ? `<a href="${pdfHref}" download="descontos-especiais.pdf" target="_blank" rel="noopener">Confira descontos especiais.</a>` : ""}
        </div>
      </div>
    </div>
  </section>
  ${renderInstallmentsModal(opcoesParcelamento)}`;
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
            ? `<div class="elementor-element elementor-element-4b71303 elementor-widget elementor-widget-n-accordion">
          <div class="elementor-widget-container">
            <div class="e-n-accordion">
              <details class="e-n-accordion-item coord-mini-cv">
                <summary class="e-n-accordion-item-title">
                  <span class="e-n-accordion-item-title-icon">${MINI_CV_CHEVRON}</span>
                  <span class="e-n-accordion-item-title-header">
                    <span class="e-n-accordion-item-title-text">Mini-currículo</span>
                  </span>
                </summary>
                <div class="coord-mini-cv__panel">
                  <div class="coord-mini-cv__panel-inner">
                    <div class="elementor-element elementor-element-7b25652 elementor-widget elementor-widget-heading">
                      <div class="elementor-widget-container">
                        <h2 class="elementor-heading-title elementor-size-default"><ul>${cvItems}</ul></h2>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>`
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
  // Cursos sem vídeo próprio usam o vídeo institucional da faculdade (data/site.json).
  const embed = youtubeEmbed(info.video) || youtubeEmbed(siteConfig.institutionalVideo);

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
        <div class="elementor-element elementor-element-${ids[idx]} elementor-widget__width-initial elementor-position-left elementor-widget elementor-widget-image-box">
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
      const iconSrc = item.imagem?.trim() ? assetUrl(item.imagem.trim(), base) : CHECK_BULLET_URL;
      const titleHtml = item.titulo?.trim()
        ? `<h3 class="elementor-image-box-title">${escapeHtml(item.titulo.trim())}</h3>`
        : "";
      return `<div class="elementor-element elementor-element-${ids[idx] || "a729781"} elementor-widget__width-initial elementor-position-left elementor-widget elementor-widget-image-box">
        <div class="elementor-widget-container">
          <div class="elementor-image-box-wrapper">
            <figure class="elementor-image-box-img"><img src="${iconSrc}" alt="" width="42" height="42" loading="lazy"></figure>
            <div class="elementor-image-box-content">
              ${titleHtml}
              <p class="elementor-image-box-description">${escapeHtml(item.texto)}</p>
            </div>
          </div>
        </div>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR" prefix="og: https://ogp.me/ns#">
<head>
  ${renderGtmHead()}
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
  <link rel="stylesheet" href="${base}assets/css/elementor/frontend.min.css">
  <link rel="stylesheet" href="${base}assets/css/elementor/post-5.css">
  <link rel="stylesheet" href="${base}assets/css/elementor/post-13.css">
  <link rel="stylesheet" href="${base}assets/css/elementor/post-1076.css">
  <link rel="stylesheet" href="${base}assets/css/elementor/post-1141.css">
  <link rel="stylesheet" href="${base}assets/css/testimonials.css">
  <link rel="stylesheet" href="${base}assets/css/course-faq.css">
  <link rel="stylesheet" href="${base}assets/css/course-investment.css">
  <link rel="stylesheet" href="${base}assets/css/course-guide.css">
  <link rel="stylesheet" href="${base}assets/css/rd-form-course.css">
  <link rel="stylesheet" href="${base}assets/css/elementor/overrides.css">
  <link rel="stylesheet" href="${base}assets/css/tokens.css">
  <link rel="stylesheet" href="${base}assets/css/base.css">
  <link rel="stylesheet" href="${base}assets/css/components.css">
  <link rel="stylesheet" href="${base}assets/css/course-modules.css">
  <link rel="stylesheet" href="${base}assets/css/responsive.css">
  ${renderSiteMotionStyles({ base })}
</head>
<body class="site-layout elementor-default elementor-kit-5 elementor-page-13">
  ${renderGtmBody()}
  ${renderHeader({ base, ctaHref: inscricaoLink })}
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
            ? renderModulesSection(modulos)
            : ""
        }

        ${renderGuideSection(course, base)}

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

      ${renderTestimonialsSection(course, ctx, base)}

      ${renderComplementBanner(course, base)}

      ${renderInvestmentSection(inv, inscricaoLink, base, course.formularios || {})}

      ${renderFaqSection(course.faq)}

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
                  <a class="elementor-button elementor-button-link elementor-size-sm" href="/paginas-de-cursos">
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
  ${renderFooter({ base })}
  ${renderCourseFormModals(course)}
  ${renderSiteLayoutScripts({ base })}
  <script src="https://d335luupugsy2.cloudfront.net/js/rdstation-forms/stable/rdstation-forms.min.js" defer></script>
  <script src="${base}assets/js/rd-form-course.js" defer></script>
  <script src="${base}assets/js/course-page.js" defer></script>
</body>
</html>`;
}
