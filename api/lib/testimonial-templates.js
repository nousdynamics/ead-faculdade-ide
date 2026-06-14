/**
 * Modelo adaptativo de depoimentos — blocos condicionais + seção fixa na página do curso.
 */

const DEFAULT_ITEM_TEMPLATE = "item-depoimento-adaptativo";
export const DEFAULT_CLASS_ROOT = "testimonial-card";

export function normalizeClassRoot(value) {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || DEFAULT_CLASS_ROOT;
}

export function getTemplateClassRoot(template) {
  return normalizeClassRoot(template?.classe_raiz || DEFAULT_CLASS_ROOT);
}

function bemClass(classeRaiz, part) {
  return `${classeRaiz}__${part}`;
}

const SECTION_HTML = `<section class="testimonials-section">
  <h2 class="testimonials-section__title">{{titulo_secao}}</h2>
  <div class="testimonials-section__grid">{{itens}}</div>
</section>`;

export const TEMPLATE_VARIABLES = {
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

export const DEFAULTS = { item: DEFAULT_ITEM_TEMPLATE };

export function variablesForTemplate() {
  return TEMPLATE_VARIABLES.item.map((v) => v.key);
}

export function extractTemplateVariables(html) {
  if (!html) return [];
  return [...new Set([...String(html).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
}

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

export function byTemplateId(templates, id) {
  return (templates || []).find((t) => t.id === id) || null;
}

export function renderTemplateStyleBlock(css) {
  const safe = String(css || "").replace(/<\/style/gi, "");
  if (!safe.trim()) return "";
  return `<style>${safe}</style>`;
}

export function getItemTemplate(cfg, templates) {
  return byTemplateId(templates, resolveItemTemplateId(cfg, templates));
}

export function resolveItemTemplateId(cfg, templates) {
  const fromCourse = cfg?.template_item_id || cfg?.template_item_texto_id;
  if (fromCourse && byTemplateId(templates, fromCourse)) return fromCourse;
  return byTemplateId(templates, DEFAULT_ITEM_TEMPLATE)?.id || DEFAULT_ITEM_TEMPLATE;
}

function buildAdaptiveBlocks(dep, base, wrap, classeRaiz = DEFAULT_CLASS_ROOT) {
  const nome = wrap(dep.nome);
  const fotoSrc = dep.foto || dep.thumbnail || "";
  const embed = youtubeEmbed(dep.video_url);

  const bloco_foto = fotoSrc
    ? `<figure class="${bemClass(classeRaiz, "avatar")}"><img src="${assetUrl(fotoSrc, base)}" alt="${nome}" width="72" height="72" loading="lazy"></figure>`
    : "";

  const bloco_video = embed
    ? `<div class="${bemClass(classeRaiz, "video")}"><iframe src="${embed}" title="Depoimento — ${nome}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>`
    : "";

  const bloco_imagem = dep.imagem
    ? `<figure class="${bemClass(classeRaiz, "figure")}"><img src="${assetUrl(dep.imagem, base)}" alt="${nome}" loading="lazy"></figure>`
    : "";

  const bloco_profissao = dep.profissao
    ? `<p class="${bemClass(classeRaiz, "role")}">${wrap(dep.profissao)}</p>`
    : "";

  const bloco_texto = dep.texto
    ? `<blockquote class="${bemClass(classeRaiz, "quote")}"><p>${wrap(dep.texto)}</p></blockquote>`
    : "";

  const bloco_legenda = dep.legenda
    ? `<p class="${bemClass(classeRaiz, "caption")}">${wrap(dep.legenda)}</p>`
    : "";

  return { bloco_foto, bloco_video, bloco_imagem, bloco_profissao, bloco_texto, bloco_legenda };
}

export function buildTestimonialVars(dep, base, { escape = true, classeRaiz = DEFAULT_CLASS_ROOT } = {}) {
  const wrap = escape ? escapeHtml : (v) => String(v ?? "");
  const root = normalizeClassRoot(classeRaiz);
  const blocks = buildAdaptiveBlocks(dep, base, wrap, root);

  return {
    classe_raiz: root,
    nome: wrap(dep.nome),
    profissao: wrap(dep.profissao || ""),
    texto: wrap(dep.texto || ""),
    legenda: wrap(dep.legenda || ""),
    video_url: wrap(dep.video_url || ""),
    foto: assetUrl(dep.foto || dep.thumbnail || "", base),
    imagem: assetUrl(dep.imagem || "", base),
    thumbnail: assetUrl(dep.thumbnail || dep.foto || "", base),
    video_embed: blocks.bloco_video,
    ...blocks,
  };
}

export function renderTestimonialItem(dep, templates, cfg, base) {
  const templateId = resolveItemTemplateId(cfg, templates);
  const tpl = byTemplateId(templates, templateId);
  if (!tpl?.html) return "";
  const root = getTemplateClassRoot(tpl);
  return applyTemplate(tpl.html, buildTestimonialVars(dep, base, { classeRaiz: root }));
}

export function renderTestimonialsSection(course, ctx, base) {
  const ids = course.depoimento_ids || [];
  const deps = ids
    .map((id) => (ctx.testimonials || []).find((t) => t.id === id))
    .filter(Boolean)
    .filter((t) => t.ativo !== false);

  if (!deps.length) return "";

  const templates = ctx.testimonialTemplates || [];
  const cfg = course.depoimentos || {};
  const titulo = cfg.titulo_secao || "O que nossos alunos dizem";
  const tpl = getItemTemplate(cfg, templates);
  const itemsHtml = deps.map((dep) => renderTestimonialItem(dep, templates, cfg, base)).join("");

  if (!itemsHtml) return "";

  const sectionHtml = applyTemplate(SECTION_HTML, {
    titulo_secao: escapeHtml(titulo),
    itens: itemsHtml,
  });

  return renderTemplateStyleBlock(tpl?.css) + sectionHtml;
}

export function wrapTestimonialPreviewHtml(html, escopo = "item") {
  if (!html?.trim()) return "";
  const scopeMod = escopo === "item" ? " template-preview-scope--item" : " template-preview-scope--secao";
  return `<div class="template-preview-scope${scopeMod}">${html}</div>`;
}

export function previewTemplate(template, _templates = [], sample = TESTIMONIAL_SAMPLE, base = "../../") {
  if (!template?.html) return "";
  const root = getTemplateClassRoot(template);
  const html = applyTemplate(template.html, buildTestimonialVars(sample, base, { classeRaiz: root }));
  return renderTemplateStyleBlock(template.css) + wrapTestimonialPreviewHtml(html, "item");
}

export function renderTestimonialsSectionPreview(course, ctx, base) {
  return renderTestimonialsSection(course, ctx, base);
}
