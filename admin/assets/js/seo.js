export function generateCourseSeo(course, nivelNome, areaNome, statusNome) {
  const titulo = course.titulo || "Curso";
  const nivel = nivelNome || "Pós-Graduação";
  const modalidade = course.informacoes?.modalidade || "100% EAD";
  const inicio = course.informacoes?.inicio_previsto;

  const title = `${titulo} - Ead Faculdade IDE`.slice(0, 60);
  let description = `${nivel} ${modalidade} em ${titulo} — Faculdade IDE.`;
  if (statusNome) description += ` ${statusNome}.`;
  if (inicio) description += ` Início previsto: ${inicio}.`;
  description = description.slice(0, 160);

  const focus = slugifyKeyword(titulo);
  const keywords = [
    nivel.toLowerCase(),
    ...titulo.toLowerCase().split(/\s+/).filter((w) => w.length > 3).slice(0, 5),
    "EAD",
    "Faculdade IDE",
    areaNome?.toLowerCase(),
  ].filter(Boolean);

  return {
    title,
    description,
    og_title: title,
    og_description: description,
    focus_keyword: focus,
    keywords: [...new Set(keywords)],
    canonical: `/pos-graduacao/${course.slug || slugifyKeyword(titulo)}`,
    schema_type: "Course",
  };
}

function slugifyKeyword(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function scoreSeo(seo, course) {
  let score = 0;
  const checks = [];

  if (seo.title && seo.title.length >= 30 && seo.title.length <= 60) {
    score += 20;
    checks.push({ ok: true, text: "Título com tamanho ideal (30–60 caracteres)" });
  } else {
    checks.push({ ok: false, text: "Título fora do ideal (30–60 caracteres)" });
  }

  if (seo.description && seo.description.length >= 120 && seo.description.length <= 160) {
    score += 20;
    checks.push({ ok: true, text: "Meta description com tamanho ideal" });
  } else if (seo.description && seo.description.length > 0) {
    score += 10;
    checks.push({ ok: false, text: "Meta description fora do ideal (120–160 caracteres)" });
  } else {
    checks.push({ ok: false, text: "Meta description vazia" });
  }

  if (seo.focus_keyword && course.titulo?.toLowerCase().includes(seo.focus_keyword.split(" ")[0])) {
    score += 15;
    checks.push({ ok: true, text: "Palavra-chave presente no título" });
  } else {
    checks.push({ ok: false, text: "Palavra-chave não encontrada no título" });
  }

  if (seo.canonical) {
    score += 15;
    checks.push({ ok: true, text: "URL canônica definida" });
  }

  if (seo.keywords?.length >= 3) {
    score += 15;
    checks.push({ ok: true, text: "Keywords suficientes" });
  } else {
    checks.push({ ok: false, text: "Adicione mais keywords" });
  }

  if (course.imagem_capa) {
    score += 15;
    checks.push({ ok: true, text: "Imagem de capa definida (Open Graph)" });
  } else {
    checks.push({ ok: false, text: "Sem imagem de capa para compartilhamento" });
  }

  return { score: Math.min(100, score), checks };
}

export function renderSeoPreview(seo, baseUrl = "https://ead-faculdade-ide.vercel.app") {
  const url = `${baseUrl}${seo.canonical || ""}`;
  return `
    <div class="seo-preview">
      <p class="seo-preview__title">${escapeHtml(seo.title || "Título da página")}</p>
      <p class="seo-preview__url">${escapeHtml(url)}</p>
      <p class="seo-preview__desc">${escapeHtml(seo.description || "Descrição da página nos resultados de busca.")}</p>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { escapeHtml };
