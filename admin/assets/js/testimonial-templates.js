/** Modelo único adaptativo — preview no painel admin. */

export const TESTIMONIAL_SAMPLE = {
  nome: "Michelle dos Santos",
  profissao: "Terapia Ocupacional",
  texto:
    "Sobre as aulas, tem sido uma experiência incrível e enriquecedora até o momento. Com profissionais de alta qualidade e ótima didática, acho que o curso conta com uma grade de aulas bem completa. Tenho gostado bastante!",
  legenda: "",
  video_url: "",
  foto: "",
  imagem: "",
  thumbnail: "",
};

export const TEMPLATE_VARIABLES = {
  secao: [
    { key: "titulo_secao", desc: "Título da seção (configurável no curso)" },
    { key: "itens", desc: "HTML de todos os depoimentos selecionados" },
  ],
  item: [
    { key: "nome", desc: "Nome do aluno (sempre exibido)" },
    { key: "bloco_foto", desc: "Foto da pessoa — só aparece se cadastrada" },
    { key: "bloco_video", desc: "Vídeo YouTube — só aparece com URL válida" },
    { key: "bloco_imagem", desc: "Imagem do depoimento — só aparece se cadastrada" },
    { key: "bloco_profissao", desc: "Profissão — só aparece se preenchida" },
    { key: "bloco_texto", desc: "Texto do depoimento — só aparece se preenchido" },
    { key: "bloco_legenda", desc: "Legenda — só aparece se preenchida" },
  ],
};

const DEFAULTS = {
  secao: "secao-depoimentos-elementor",
  item: "item-depoimento-adaptativo",
};

export const STARTER_HTML = {
  secao: `<section class="testimonials-section">
  <h2 class="testimonials-section__title">{{titulo_secao}}</h2>
  <div class="testimonials-section__grid">{{itens}}</div>
</section>`,
  item: `<article class="testimonial-card">
  {{bloco_foto}}
  {{bloco_video}}
  {{bloco_imagem}}
  <header class="testimonial-card__header">
    <h3 class="testimonial-card__name">{{nome}}</h3>
    {{bloco_profissao}}
  </header>
  {{bloco_texto}}
  {{bloco_legenda}}
</article>`,
};

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
  if (path.startsWith("/")) return path;
  return `${base}${path.replace(/^\//, "")}`;
}

function youtubeEmbed(url) {
  if (!url) return "";
  const match = String(url).trim().match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : "";
}

export function applyTemplate(html, vars) {
  if (!html) return "";
  let out = html;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value ?? "");
  }
  return out;
}

function byTemplateId(templates, id) {
  return (templates || []).find((t) => t.id === id) || null;
}

export function variablesForTemplate(escopo) {
  if (escopo === "secao") return TEMPLATE_VARIABLES.secao.map((v) => v.key);
  return TEMPLATE_VARIABLES.item.map((v) => v.key);
}

export function extractTemplateVariables(html) {
  if (!html) return [];
  return [...new Set([...String(html).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
}

export function renderVariablesHelp(escopo) {
  const list = escopo === "secao" ? TEMPLATE_VARIABLES.secao : TEMPLATE_VARIABLES.item;
  return list.map((v) => `<li><code>{{${v.key}}}</code> — ${escapeHtml(v.desc)}</li>`).join("");
}

function buildAdaptiveBlocks(dep, base, wrap) {
  const nome = wrap(dep.nome);
  const fotoSrc = dep.foto || dep.thumbnail || "";
  const embed = youtubeEmbed(dep.video_url);

  const bloco_foto = fotoSrc
    ? `<figure class="testimonial-card__avatar"><img src="${assetUrl(fotoSrc, base)}" alt="${nome}" width="72" height="72" loading="lazy"></figure>`
    : "";

  const bloco_video = embed
    ? `<div class="testimonial-card__video"><iframe src="${embed}" title="Depoimento — ${nome}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>`
    : "";

  const bloco_imagem = dep.imagem
    ? `<figure class="testimonial-card__figure"><img src="${assetUrl(dep.imagem, base)}" alt="${nome}" loading="lazy"></figure>`
    : "";

  const bloco_profissao = dep.profissao
    ? `<p class="testimonial-card__role">${wrap(dep.profissao)}</p>`
    : "";

  const bloco_texto = dep.texto
    ? `<blockquote class="testimonial-card__quote"><p>${wrap(dep.texto)}</p></blockquote>`
    : "";

  const bloco_legenda = dep.legenda
    ? `<p class="testimonial-card__caption">${wrap(dep.legenda)}</p>`
    : "";

  return { bloco_foto, bloco_video, bloco_imagem, bloco_profissao, bloco_texto, bloco_legenda };
}

export function buildTestimonialVars(dep, base = "../../") {
  const wrap = escapeHtml;
  const blocks = buildAdaptiveBlocks(dep, base, wrap);
  return {
    nome: wrap(dep.nome),
    profissao: wrap(dep.profissao || ""),
    texto: wrap(dep.texto || ""),
    legenda: wrap(dep.legenda || ""),
    video_url: wrap(dep.video_url || ""),
    foto: assetUrl(dep.foto || dep.thumbnail || "", base),
    imagem: assetUrl(dep.imagem || "", base),
    ...blocks,
  };
}

function resolveItemTemplateId(cfg, templates) {
  const fromCourse = cfg?.template_item_id || cfg?.template_item_texto_id;
  if (fromCourse && byTemplateId(templates, fromCourse)) return fromCourse;
  return DEFAULTS.item;
}

function resolveSectionTemplateId(cfg, templates) {
  const fromCourse = cfg?.template_secao_id;
  if (fromCourse && byTemplateId(templates, fromCourse)) return fromCourse;
  return DEFAULTS.secao;
}

function renderTestimonialItem(dep, templates, cfg, base) {
  const tpl = byTemplateId(templates, resolveItemTemplateId(cfg, templates));
  if (!tpl?.html) return "";
  return applyTemplate(tpl.html, buildTestimonialVars(dep, base));
}

export function renderTestimonialsSectionPreview(course, testimonials, templates, base = "../../") {
  const ids = course.depoimento_ids || [];
  const deps = ids
    .map((id) => testimonials.find((t) => t.id === id))
    .filter(Boolean)
    .filter((t) => t.ativo !== false);

  if (!deps.length) return "";

  const cfg = course.depoimentos || {};
  const titulo = cfg.titulo_secao || "O que nossos alunos dizem";
  const sectionTpl = byTemplateId(templates, resolveSectionTemplateId(cfg, templates));
  const itemsHtml = deps.map((dep) => renderTestimonialItem(dep, templates, cfg, base)).join("");

  if (!sectionTpl?.html) return wrapTestimonialPreviewHtml(itemsHtml, "secao");

  return wrapTestimonialPreviewHtml(
    applyTemplate(sectionTpl.html, {
      titulo_secao: escapeHtml(titulo),
      itens: itemsHtml,
    }),
    "secao",
  );
}

export function wrapTestimonialPreviewHtml(html, escopo = null) {
  if (!html?.trim()) return "";
  const scopeMod =
    escopo === "item"
      ? " template-preview-scope--item"
      : escopo === "secao"
        ? " template-preview-scope--secao"
        : "";
  return `<div class="template-preview-scope${scopeMod}">${html}</div>`;
}

export function previewTemplate(template, templates = [], sample = TESTIMONIAL_SAMPLE, base = "/") {
  if (!template?.html) return "";
  const escopo = template.escopo === "secao" ? "secao" : "item";
  let html;
  if (escopo === "secao") {
    const itemTpl = byTemplateId(templates, DEFAULTS.item);
    const fakeItem = itemTpl?.html
      ? applyTemplate(itemTpl.html, buildTestimonialVars(sample, base))
      : "";
    html = applyTemplate(template.html, {
      titulo_secao: escapeHtml("O que nossos alunos dizem"),
      itens: fakeItem,
    });
  } else {
    html = applyTemplate(template.html, buildTestimonialVars(sample, base));
  }
  return wrapTestimonialPreviewHtml(html, escopo);
}

export function starterHtmlFor(escopo) {
  return escopo === "secao" ? STARTER_HTML.secao : STARTER_HTML.item;
}

export function templateEscopoLabel(escopo) {
  return escopo === "secao" ? "Seção" : "Depoimento";
}

export function templateTipoLabel() {
  return "Adaptativo";
}

export function inferTestimonialKind(item) {
  if (item?.video_url?.trim()) return "video";
  if (item?.imagem?.trim()) return "imagem";
  return "texto";
}
