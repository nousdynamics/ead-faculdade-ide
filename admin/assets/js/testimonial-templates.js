/** Motor de modelos de depoimento — preview no painel admin. */

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

const DEFAULTS = {
  secao: "secao-depoimentos-elementor",
  texto: "item-texto-elementor",
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

export function templateEscopoLabel(escopo) {
  return escopo === "secao" ? "Seção" : "Item";
}

export function templateTipoLabel(tipo) {
  if (!tipo) return "—";
  return { texto: "Texto", video: "Vídeo", imagem: "Imagem" }[tipo] || tipo;
}
