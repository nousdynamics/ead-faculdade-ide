/** Motor de modelos de depoimento — preview e referência no painel admin. */

export const TESTIMONIAL_SAMPLE = {
  nome: "Michelle dos Santos",
  tipo: "texto",
  profissao: "Terapia Ocupacional",
  texto:
    "Sobre as aulas, tem sido uma experiência incrível e enriquecedora até o momento. Com profissionais de alta qualidade e ótima didática, acho que o curso conta com uma grade de aulas bem completa. Tenho gostado bastante!",
  legenda: "Depoimento em vídeo sobre a experiência no curso.",
  video_url: "https://www.youtube.com/watch?v=XHOmBV4js_E",
  thumbnail: "",
  imagem: "/assets/img/Camila-da-Silva-Pereira-2.jpeg",
};

export const TEMPLATE_VARIABLES = {
  secao: [
    { key: "titulo_secao", desc: "Título da seção (configurável no curso)" },
    { key: "itens", desc: "HTML de todos os depoimentos selecionados" },
  ],
  item_texto: [
    { key: "nome", desc: "Nome do aluno" },
    { key: "profissao", desc: "Profissão ou formação" },
    { key: "texto", desc: "Texto do depoimento" },
    { key: "legenda", desc: "Legenda alternativa" },
  ],
  item_video: [
    { key: "nome", desc: "Nome do aluno" },
    { key: "profissao", desc: "Profissão ou formação" },
    { key: "legenda", desc: "Legenda do vídeo" },
    { key: "video_url", desc: "URL do YouTube" },
    { key: "video_embed", desc: "Iframe pronto para embed" },
    { key: "thumbnail", desc: "URL da thumbnail" },
  ],
  item_imagem: [
    { key: "nome", desc: "Nome do aluno" },
    { key: "legenda", desc: "Legenda da imagem" },
    { key: "imagem", desc: "URL da imagem" },
  ],
};

const DEFAULTS = {
  secao: "secao-depoimentos-elementor",
  texto: "item-texto-elementor",
  video: "item-video-padrao",
  imagem: "item-imagem-padrao",
};

export const STARTER_HTML = {
  secao: `<div class="testimonial-section">
  <h2>{{titulo_secao}}</h2>
  <div class="testimonial-section__items">{{itens}}</div>
</div>`,
  item: {
    texto: `<div class="jet-listing-grid__item testimonial-item testimonial-item--texto">
  <p class="testimonial-item__name">{{nome}}</p>
  <p class="testimonial-item__role">{{profissao}}</p>
  <p class="testimonial-item__text">{{texto}}</p>
</div>`,
    video: `<div class="jet-listing-grid__item testimonial-item testimonial-item--video">
  <div class="testimonial-item__media">{{video_embed}}</div>
  <p class="testimonial-item__name">{{nome}}</p>
  <p class="testimonial-item__caption">{{legenda}}</p>
</div>`,
    imagem: `<div class="jet-listing-grid__item testimonial-item testimonial-item--imagem">
  <figure class="testimonial-item__figure">
    <img src="{{imagem}}" alt="{{nome}}" loading="lazy">
    <figcaption><strong>{{nome}}</strong><span>{{legenda}}</span></figcaption>
  </figure>
</div>`,
  },
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

export function variablesForTemplate(escopo, tipo) {
  if (escopo === "secao") return TEMPLATE_VARIABLES.secao.map((v) => v.key);
  const map = { texto: "item_texto", video: "item_video", imagem: "item_imagem" };
  return (TEMPLATE_VARIABLES[map[tipo]] || TEMPLATE_VARIABLES.item_texto).map((v) => v.key);
}

export function extractTemplateVariables(html) {
  if (!html) return [];
  return [...new Set([...String(html).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))];
}

export function renderVariablesHelp(escopo, tipo) {
  const list = escopo === "secao"
    ? TEMPLATE_VARIABLES.secao
    : TEMPLATE_VARIABLES[{ texto: "item_texto", video: "item_video", imagem: "item_imagem" }[tipo] || "item_texto"];

  return list
    .map((v) => `<li><code>{{${v.key}}}</code> — ${escapeHtml(v.desc)}</li>`)
    .join("");
}

function resolveItemTemplateId(cfg, tipo, templates) {
  const key = `template_item_${tipo}_id`;
  const fromCourse = cfg?.[key];
  if (fromCourse && byTemplateId(templates, fromCourse)) return fromCourse;
  const fallback = DEFAULTS[tipo] || DEFAULTS.texto;
  return byTemplateId(templates, fallback)?.id || fallback;
}

function resolveSectionTemplateId(cfg, templates) {
  const fromCourse = cfg?.template_secao_id;
  if (fromCourse && byTemplateId(templates, fromCourse)) return fromCourse;
  return DEFAULTS.secao;
}

export function buildTestimonialVars(dep, base = "../../") {
  const embed = youtubeEmbed(dep.video_url);
  const thumb = dep.thumbnail || dep.imagem || "";

  return {
    nome: escapeHtml(dep.nome),
    profissao: escapeHtml(dep.profissao || ""),
    texto: escapeHtml(dep.texto || dep.legenda || ""),
    legenda: escapeHtml(dep.legenda || dep.profissao || ""),
    video_url: escapeHtml(dep.video_url || ""),
    thumbnail: assetUrl(thumb, base),
    imagem: assetUrl(dep.imagem, base),
    video_embed: embed
      ? `<iframe class="testimonial-item__video" src="${embed}" title="Depoimento — ${escapeHtml(dep.nome)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>`
      : "",
  };
}

function renderTestimonialItem(dep, templates, cfg, base) {
  const tipo = dep.tipo || "texto";
  const templateId = resolveItemTemplateId(cfg, tipo, templates);
  const tpl = byTemplateId(templates, templateId);
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
  const sectionId = resolveSectionTemplateId(cfg, templates);
  const sectionTpl = byTemplateId(templates, sectionId);
  const itemsHtml = deps.map((dep) => renderTestimonialItem(dep, templates, cfg, base)).join("");

  if (!sectionTpl?.html) return itemsHtml;

  return applyTemplate(sectionTpl.html, {
    titulo_secao: escapeHtml(titulo),
    itens: itemsHtml,
  });
}

export function previewTemplate(template, templates = [], sample = TESTIMONIAL_SAMPLE, base = "../../") {
  if (!template?.html) return "";
  if (template.escopo === "secao") {
    const itemTpl = byTemplateId(templates, DEFAULTS.texto);
    const fakeItem = itemTpl?.html
      ? applyTemplate(itemTpl.html, buildTestimonialVars(sample, base))
      : "";
    return applyTemplate(template.html, {
      titulo_secao: escapeHtml("O que nossos alunos dizem"),
      itens: fakeItem,
    });
  }
  const sampleByTipo = { ...sample, tipo: template.tipo || "texto" };
  return applyTemplate(template.html, buildTestimonialVars(sampleByTipo, base));
}

export function starterHtmlFor(escopo, tipo) {
  if (escopo === "secao") return STARTER_HTML.secao;
  return STARTER_HTML.item[tipo] || STARTER_HTML.item.texto;
}

export function templateEscopoLabel(escopo) {
  return escopo === "secao" ? "Seção" : "Item";
}

export function templateTipoLabel(tipo) {
  if (!tipo) return "—";
  return { texto: "Texto", video: "Vídeo", imagem: "Imagem" }[tipo] || tipo;
}
