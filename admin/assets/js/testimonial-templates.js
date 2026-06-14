/** Modelo adaptativo — preview no painel admin. A seção é fixa; só o card é editável. */

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
  item: [
    { key: "classe_raiz", desc: "Classe raiz do card (use em class=\"{{classe_raiz}}\" se quiser)" },
    { key: "nome", desc: "Nome do aluno (sempre exibido)" },
    { key: "bloco_foto", desc: "Foto da pessoa — só aparece se cadastrada" },
    { key: "bloco_video", desc: "Vídeo YouTube — só aparece com URL válida" },
    { key: "bloco_imagem", desc: "Imagem do depoimento — só aparece se cadastrada" },
    { key: "bloco_profissao", desc: "Profissão — só aparece se preenchida" },
    { key: "bloco_texto", desc: "Texto do depoimento — só aparece se preenchido" },
    { key: "bloco_legenda", desc: "Legenda — só aparece se preenchida" },
  ],
};

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

export function defaultClassRootForId(id) {
  const slug = String(id || "").trim().replace(/_/g, "-");
  if (!slug) return DEFAULT_CLASS_ROOT;
  const root = normalizeClassRoot(`dep-${slug}`);
  return root === "dep" ? DEFAULT_CLASS_ROOT : root;
}

export function remapTemplateClassNames(html, css, oldRoot, newRoot) {
  const from = normalizeClassRoot(oldRoot);
  const to = normalizeClassRoot(newRoot);
  if (from === to) return { html: html || "", css: css || "" };
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${esc(from)}(__[a-z0-9_-]+)?`, "gi");
  const replaceAll = (text) => String(text || "").replace(re, (_, suffix) => to + (suffix || ""));
  return { html: replaceAll(html), css: replaceAll(css) };
}

function bemClass(classeRaiz, part) {
  return `${classeRaiz}__${part}`;
}

const SECTION_HTML = `<section class="testimonials-section">
  <h2 class="testimonials-section__title">{{titulo_secao}}</h2>
  <div class="testimonials-section__grid">{{itens}}</div>
</section>`;

export const STARTER_HTML = `<article class="testimonial-card">
  {{bloco_foto}}
  {{bloco_video}}
  {{bloco_imagem}}
  <header class="testimonial-card__header">
    <h3 class="testimonial-card__name">{{nome}}</h3>
    {{bloco_profissao}}
  </header>
  {{bloco_texto}}
  {{bloco_legenda}}
</article>`;

export const STARTER_CSS = `.testimonial-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  width: 100%;
  max-width: 400px;
  margin-inline: auto;
  padding: 32px;
  box-sizing: border-box;
  border: 1px solid #d3dbe1;
  border-radius: 24px;
  background: #fff;
  box-shadow: 20px 20px 60px #bebebe, -20px -20px 60px #ffffff;
}

.testimonial-card__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
}

.testimonial-card__name {
  margin: 0;
  font-family: var(--font-heading, "Gotham", sans-serif);
  font-size: 22px;
  font-weight: 500;
  line-height: 32px;
  text-align: center;
  color: var(--color-primary, #2b325c);
}

.testimonial-card__role {
  margin: 0;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  text-align: center;
  color: var(--color-primary, #2b325c);
}

.testimonial-card__quote {
  margin: 0;
  width: 100%;
  text-align: center;
}

.testimonial-card__quote p {
  margin: 0;
  font-size: 0.8em;
  font-weight: 400;
  line-height: 1.1em;
  text-wrap: balance;
  color: var(--color-primary, #2b325c);
}

.testimonial-card__caption {
  margin: 0;
  width: 100%;
  font-size: 0.75rem;
  line-height: 1.4;
  text-align: center;
  opacity: 0.85;
  color: var(--color-primary, #2b325c);
}

.testimonial-card__avatar {
  margin: 0 auto;
  width: 100%;
  text-align: center;
}

.testimonial-card__avatar img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
}

.testimonial-card__video {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
}

.testimonial-card__video iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.testimonial-card__figure {
  margin: 0;
  width: 100%;
}

.testimonial-card__figure img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 12px;
}`;

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

export function renderTemplateStyleBlock(css) {
  const safe = String(css || "").replace(/<\/style/gi, "");
  if (!safe.trim()) return "";
  return `<style>${safe}</style>`;
}

export function getItemTemplate(cfg, templates) {
  return byTemplateId(templates, resolveItemTemplateId(cfg, templates));
}

export function variablesForTemplate() {
  return TEMPLATE_VARIABLES.item.map((v) => v.key);
}

export function extractTemplateVariables(html) {
  if (!html) return [];
  return [...new Set([...String(html).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
}

export function renderVariablesHelp() {
  return TEMPLATE_VARIABLES.item
    .map((v) => `<li><code>{{${v.key}}}</code> — ${escapeHtml(v.desc)}</li>`)
    .join("");
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

export function buildTestimonialVars(dep, base = "../../", { classeRaiz = DEFAULT_CLASS_ROOT } = {}) {
  const root = normalizeClassRoot(classeRaiz);
  const wrap = escapeHtml;
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
    ...blocks,
  };
}

function resolveItemTemplateId(cfg, templates) {
  const fromCourse = cfg?.template_item_id || cfg?.template_item_texto_id;
  if (fromCourse && byTemplateId(templates, fromCourse)) return fromCourse;
  return DEFAULT_ITEM_TEMPLATE;
}

function renderTestimonialItem(dep, templates, cfg, base) {
  const tpl = byTemplateId(templates, resolveItemTemplateId(cfg, templates));
  if (!tpl?.html) return "";
  const root = getTemplateClassRoot(tpl);
  return applyTemplate(tpl.html, buildTestimonialVars(dep, base, { classeRaiz: root }));
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
  const tpl = getItemTemplate(cfg, templates);
  const itemsHtml = deps.map((dep) => renderTestimonialItem(dep, templates, cfg, base)).join("");

  if (!itemsHtml) return "";

  const css = tpl?.css?.trim() ? tpl.css : starterCssFor(getTemplateClassRoot(tpl));
  const sectionHtml = applyTemplate(SECTION_HTML, {
    titulo_secao: escapeHtml(titulo),
    itens: itemsHtml,
  });

  return wrapTestimonialPreviewHtml(renderTemplateStyleBlock(css) + sectionHtml, "secao");
}

export function wrapTestimonialPreviewHtml(html, escopo = "item") {
  if (!html?.trim()) return "";
  const scopeMod =
    escopo === "item"
      ? " template-preview-scope--item"
      : escopo === "secao"
        ? " template-preview-scope--secao"
        : "";
  return `<div class="template-preview-scope${scopeMod}">${html}</div>`;
}

export function previewTemplate(template, _templates = [], sample = TESTIMONIAL_SAMPLE, base = "/") {
  if (!template?.html) return "";
  const root = getTemplateClassRoot(template);
  const html = applyTemplate(template.html, buildTestimonialVars(sample, base, { classeRaiz: root }));
  const css = template.css?.trim() ? template.css : starterCssFor(root);
  return renderTemplateStyleBlock(css) + wrapTestimonialPreviewHtml(html, "item");
}

export function starterHtmlFor(classeRaiz = DEFAULT_CLASS_ROOT) {
  const root = normalizeClassRoot(classeRaiz);
  return STARTER_HTML.replaceAll(DEFAULT_CLASS_ROOT, root);
}

export function starterCssFor(classeRaiz = DEFAULT_CLASS_ROOT) {
  const root = normalizeClassRoot(classeRaiz);
  return STARTER_CSS.replaceAll(DEFAULT_CLASS_ROOT, root);
}

export function templateEscopoLabel() {
  return "Depoimento";
}

export function templateTipoLabel() {
  return "Adaptativo";
}

export function inferTestimonialKind(item) {
  if (item?.video_url?.trim()) return "video";
  if (item?.imagem?.trim()) return "imagem";
  return "texto";
}
