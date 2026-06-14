import {
  initStore, getAll, getById, lookup, upsertItem, deleteItem,
  exportAll, uid, slugify, loadFromLocalStorage,
} from "./store.js";
import { generateCourseSeo, scoreSeo, renderSeoPreview, escapeHtml } from "./seo.js";
import { login, logout, verifySession, isAuthenticated, getUser } from "./auth.js";

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const NAV = [
  { group: "Principal" },
  { route: "dashboard", label: "Dashboard", icon: "◫" },
  { route: "courses", label: "Cursos", icon: "◈" },
  { group: "Conteúdo" },
  { route: "professors", label: "Professores", icon: "◉" },
  { route: "coordination", label: "Coordenação", icon: "◎" },
  { route: "testimonials-text", label: "Depoimentos (texto)", icon: "❝" },
  { route: "testimonials-video", label: "Depoimentos (vídeo)", icon: "▶" },
  { route: "testimonials-image", label: "Depoimentos (imagem)", icon: "▣" },
  { group: "Configurações" },
  { route: "areas", label: "Áreas", icon: "◫" },
  { route: "formation-levels", label: "Níveis de formação", icon: "◆" },
  { route: "statuses", label: "Status do curso", icon: "●" },
];

let currentRoute = "dashboard";
let editId = null;

function toast(msg, type = "success") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = `toast${type === "error" ? " toast--error" : ""}`;
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, 3200);
}

function setPage(title, subtitle) {
  $("#page-title").textContent = title;
  $("#page-subtitle").textContent = subtitle || "";
}

function statusBadge(statusId) {
  const s = getById("statuses", statusId);
  if (!s) return '<span class="badge badge--draft">—</span>';
  const cls = statusId === "inscricoes-abertas" ? "open"
    : statusId === "turma-confirmada" ? "confirmed" : "closed";
  return `<span class="badge badge--${cls}">${escapeHtml(s.nome)}</span>`;
}

function renderNav() {
  $("#nav").innerHTML = NAV.map((item) => {
    if (item.group) return `<div class="nav-group">${item.group}</div>`;
    const active = currentRoute === item.route || (item.route === "courses" && currentRoute.startsWith("course"));
    return `<a href="#/${item.route}" class="${active ? "active" : ""}" data-route="${item.route}"><span>${item.icon}</span><span>${item.label}</span></a>`;
  }).join("");
}

function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, "") || "dashboard";
  const parts = hash.split("/");
  return { route: parts[0], id: parts[1] || null };
}

async function navigate() {
  const { route, id } = parseRoute();
  currentRoute = route;
  editId = id;
  renderNav();

  const content = $("#content");
  try {
    if (route === "dashboard") content.innerHTML = renderDashboard();
    else if (route === "courses" && !id) content.innerHTML = renderCoursesList();
    else if (route === "courses" && id === "novo") content.innerHTML = renderCourseForm(null);
    else if (route === "courses" && id) content.innerHTML = renderCourseForm(getById("courses", id));
    else if (route === "professors") content.innerHTML = renderEntityList("professors", "Professores", renderProfessorForm);
    else if (route === "coordination") content.innerHTML = renderEntityList("coordination", "Coordenação pedagógica", renderCoordForm);
    else if (route === "testimonials-text") content.innerHTML = renderEntityList("testimonials-text", "Depoimentos (texto)", renderTestimonialTextForm);
    else if (route === "testimonials-video") content.innerHTML = renderEntityList("testimonials-video", "Depoimentos (vídeo)", renderTestimonialVideoForm);
    else if (route === "testimonials-image") content.innerHTML = renderEntityList("testimonials-image", "Depoimentos (imagem)", renderTestimonialImageForm);
    else if (route === "areas") content.innerHTML = renderTaxonomy("areas", "Áreas", true);
    else if (route === "formation-levels") content.innerHTML = renderTaxonomy("formation-levels", "Níveis de formação", true);
    else if (route === "statuses") content.innerHTML = renderTaxonomy("statuses", "Status do curso", false);
    else content.innerHTML = renderDashboard();
    bindEvents();
  } catch (err) {
    content.innerHTML = `<div class="panel"><div class="panel__body empty"><p>Erro ao carregar: ${escapeHtml(err.message)}</p></div></div>`;
  }
}

function renderDashboard() {
  setPage("Dashboard", "Visão geral do conteúdo");
  const courses = getAll("courses");
  const published = courses.filter((c) => c.publicado);
  const open = courses.filter((c) => c.status_curso_id === "inscricoes-abertas");

  return `
    <div class="stats">
      <div class="stat-card"><div class="stat-card__value">${courses.length}</div><div class="stat-card__label">Cursos cadastrados</div></div>
      <div class="stat-card"><div class="stat-card__value">${published.length}</div><div class="stat-card__label">Publicados</div></div>
      <div class="stat-card"><div class="stat-card__value">${open.length}</div><div class="stat-card__label">Inscrições abertas</div></div>
      <div class="stat-card"><div class="stat-card__value">${getAll("professors").length}</div><div class="stat-card__label">Professores</div></div>
    </div>
    <div class="panel">
      <div class="panel__head"><h2>Últimos cursos</h2><a href="#/courses/novo" class="btn btn--primary btn--sm">+ Novo curso</a></div>
      <div class="panel__body table-wrap">
        ${courses.length ? `<table>
          <thead><tr><th>Curso</th><th>Nível</th><th>Área</th><th>Status</th><th></th></tr></thead>
          <tbody>${courses.slice(0, 8).map((c) => `<tr>
            <td><strong>${escapeHtml(c.titulo)}</strong></td>
            <td>${escapeHtml(lookup("formation-levels", c.nivel_formacao_id))}</td>
            <td>${escapeHtml(lookup("areas", c.area_id))}</td>
            <td>${statusBadge(c.status_curso_id)}</td>
            <td><a href="#/courses/${c.id}" class="btn btn--ghost btn--sm">Editar</a></td>
          </tr>`).join("")}</tbody>
        </table>` : `<div class="empty"><p>Nenhum curso cadastrado.</p><a href="#/courses/novo" class="btn btn--primary">Criar primeiro curso</a></div>`}
      </div>
    </div>`;
}

function renderCoursesList() {
  setPage("Cursos", "Gerencie todas as pós-graduações e cursos");
  const courses = getAll("courses");
  return `
    <div class="panel">
      <div class="panel__head">
        <h2>Todos os cursos (${courses.length})</h2>
        <a href="#/courses/novo" class="btn btn--primary">+ Novo curso</a>
      </div>
      <div class="panel__body table-wrap">
        <table>
          <thead><tr><th>Título</th><th>Slug</th><th>Nível</th><th>Status</th><th>Publicado</th><th>Ações</th></tr></thead>
          <tbody>
            ${courses.map((c) => `<tr>
              <td><strong>${escapeHtml(c.titulo)}</strong><br><small style="color:var(--muted)">${escapeHtml(c.subtitulo || "").slice(0, 60)}</small></td>
              <td><code>${escapeHtml(c.slug)}</code></td>
              <td>${escapeHtml(lookup("formation-levels", c.nivel_formacao_id))}</td>
              <td>${statusBadge(c.status_curso_id)}</td>
              <td>${c.publicado ? '<span class="badge badge--live">Sim</span>' : '<span class="badge badge--draft">Rascunho</span>'}</td>
              <td class="table-actions">
                <a href="#/courses/${c.id}" class="btn btn--ghost btn--sm">Editar</a>
                <button type="button" class="btn btn--ghost btn--sm" data-delete-course="${c.id}">Excluir</button>
              </td>
            </tr>`).join("") || `<tr><td colspan="6" class="empty">Nenhum curso.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}

function checkboxGroup(name, collection, selectedIds, label) {
  const items = getAll(collection);
  return `
    <div class="form-group form-group--full">
      <label>${label}</label>
      <div class="form-checks">
        ${items.map((item) => `
          <label class="form-check">
            <input type="checkbox" name="${name}" value="${item.id}" ${selectedIds.includes(item.id) ? "checked" : ""}>
            ${escapeHtml(item.nome)}
          </label>`).join("")}
        ${!items.length ? "<small>Nenhum item cadastrado.</small>" : ""}
      </div>
    </div>`;
}

function selectField(name, collection, value, label, required = false) {
  const items = getAll(collection);
  return `
    <div class="form-group">
      <label for="${name}">${label}</label>
      <select id="${name}" name="${name}" ${required ? "required" : ""}>
        <option value="">Selecione…</option>
        ${items.map((item) => `<option value="${item.id}" ${item.id === value ? "selected" : ""}>${escapeHtml(item.nome)}</option>`).join("")}
      </select>
    </div>`;
}

function renderCourseForm(course) {
  const isNew = !course;
  const c = course || emptyCourse();
  setPage(isNew ? "Novo curso" : `Editar: ${c.titulo}`, "Preencha todos os campos do curso");

  const seo = c.seo || {};
  const seoResult = scoreSeo(seo, c);

  return `
    <form id="course-form" class="course-form">
      <div class="panel">
        <div class="panel__head"><h2>Informações básicas</h2>
          <label class="form-check"><input type="checkbox" name="publicado" ${c.publicado ? "checked" : ""}> Publicado</label>
        </div>
        <div class="panel__body form-grid">
          <div class="form-group form-group--full">
            <label for="titulo">Título *</label>
            <input id="titulo" name="titulo" value="${escapeHtml(c.titulo)}" required>
          </div>
          <div class="form-group form-group--full">
            <label for="subtitulo">Subtítulo</label>
            <input id="subtitulo" name="subtitulo" value="${escapeHtml(c.subtitulo || "")}">
          </div>
          <div class="form-group form-group--full">
            <label for="slug">Slug (URL)</label>
            <input id="slug" name="slug" value="${escapeHtml(c.slug || "")}" placeholder="gerado-automaticamente">
            <small>/pos-graduacao/<strong id="slug-preview">${escapeHtml(c.slug || "slug-do-curso")}</strong></small>
          </div>
          <div class="form-group form-group--full">
            <label for="imagem_capa">Imagem de capa</label>
            <input id="imagem_capa" name="imagem_capa" value="${escapeHtml(c.imagem_capa || "")}" placeholder="assets/img/nome-da-imagem.jpg">
          </div>
          ${selectField("nivel_formacao_id", "formation-levels", c.nivel_formacao_id, "Nível de formação", true)}
          ${selectField("area_id", "areas", c.area_id, "Área", true)}
          ${selectField("status_curso_id", "statuses", c.status_curso_id, "Status do curso", true)}
        </div>
      </div>

      <div class="panel">
        <div class="panel__head"><h2>Relacionamentos</h2></div>
        <div class="panel__body form-grid">
          ${checkboxGroup("coordenacao_ids", "coordination", c.coordenacao_ids || [], "Coordenação pedagógica")}
          ${checkboxGroup("professor_ids", "professors", c.professor_ids || [], "Professores")}
          ${checkboxGroup("depoimento_texto_ids", "testimonials-text", c.depoimento_texto_ids || [], "Depoimentos (texto)")}
          ${checkboxGroup("depoimento_video_ids", "testimonials-video", c.depoimento_video_ids || [], "Depoimentos (vídeo)")}
          ${checkboxGroup("depoimento_imagem_ids", "testimonials-image", c.depoimento_imagem_ids || [], "Depoimentos (imagem)")}
        </div>
      </div>

      <div class="sections">
        ${renderHeroSection(c)}
        ${renderInfoSection(c)}
        ${renderAboutSection(c)}
        ${renderModulesSection(c)}
        ${renderAudienceSection(c)}
        ${renderInvestmentSection(c)}
        ${renderFaqSection(c)}
        ${renderSeoSection(c, seo, seoResult)}
      </div>

      <div class="form-actions">
        <a href="#/courses" class="btn btn--ghost">Cancelar</a>
        <button type="submit" class="btn btn--primary">Salvar curso</button>
      </div>
    </form>`;
}

function renderHeroSection(c) {
  const h = c.hero || {};
  return `<details class="section" open><summary>Botão Hero</summary><div class="section__body form-grid">
    <div class="form-group"><label>Texto do botão</label><input name="hero_texto_botao" value="${escapeHtml(h.texto_botao || "")}"></div>
    <div class="form-group"><label>Link do botão</label><input name="hero_link_botao" value="${escapeHtml(h.link_botao || "")}"></div>
  </div></details>`;
}

function renderInfoSection(c) {
  const i = c.informacoes || {};
  return `<details class="section"><summary>Informações</summary><div class="section__body form-grid form-grid--3">
    <div class="form-group"><label>Carga horária</label><input name="info_carga_horaria" value="${escapeHtml(i.carga_horaria || "")}"></div>
    <div class="form-group"><label>Duração</label><input name="info_duracao" value="${escapeHtml(i.duracao || "")}"></div>
    <div class="form-group"><label>Início previsto</label><input name="info_inicio_previsto" value="${escapeHtml(i.inicio_previsto || "")}"></div>
    <div class="form-group"><label>Modalidade</label><input name="info_modalidade" value="${escapeHtml(i.modalidade || "")}"></div>
    <div class="form-group"><label>Vagas</label><input name="info_vagas" value="${escapeHtml(i.vagas || "")}"></div>
    <div class="form-group"><label>Aulas</label><input name="info_aulas" value="${escapeHtml(i.aulas || "")}"></div>
    <div class="form-group"><label>Vídeo (YouTube URL)</label><input name="info_video" value="${escapeHtml(i.video || "")}"></div>
    <div class="form-group"><label>Últimas vagas</label><select name="info_ultimas_vagas"><option value="false" ${!i.ultimas_vagas ? "selected" : ""}>Não</option><option value="true" ${i.ultimas_vagas ? "selected" : ""}>Sim</option></select></div>
    <div class="form-group"><label>Confirmado?</label><select name="info_confirmado"><option value="false" ${!i.confirmado ? "selected" : ""}>Não</option><option value="true" ${i.confirmado ? "selected" : ""}>Sim</option></select></div>
    <div class="form-group"><label>Pré-inscrição</label><select name="info_pre_inscricao"><option value="false" ${!i.pre_inscricao ? "selected" : ""}>Não</option><option value="true" ${i.pre_inscricao ? "selected" : ""}>Sim</option></select></div>
  </div></details>`;
}

function renderAboutSection(c) {
  const s = c.sobre || {};
  return `<details class="section"><summary>Conheça o curso</summary><div class="section__body form-grid">
    <div class="form-group"><label>Tag</label><input name="sobre_tag" value="${escapeHtml(s.tag || "Conheça o curso")}"></div>
    <div class="form-group form-group--full"><label>Parágrafo 1</label><textarea name="sobre_p1">${escapeHtml(s.paragrafos?.[0] || "")}</textarea></div>
    <div class="form-group form-group--full"><label>Parágrafo 2</label><textarea name="sobre_p2">${escapeHtml(s.paragrafos?.[1] || "")}</textarea></div>
    <div class="form-group form-group--full"><label>Matriz curricular (HTML)</label><textarea name="matriz_curricular" rows="4">${escapeHtml(c.matriz_curricular || "")}</textarea></div>
    <div class="form-group form-group--full"><label>Destaques do curso (HTML)</label><textarea name="destaques" rows="4">${escapeHtml(c.destaques || "")}</textarea></div>
    <div class="form-group form-group--full"><label>Objetivos do curso (HTML)</label><textarea name="objetivos" rows="4">${escapeHtml(c.objetivos || "")}</textarea></div>
  </div></details>`;
}

function renderModulesSection(c) {
  const mods = c.modulos || [];
  return `<details class="section"><summary>Módulos (${mods.length})</summary><div class="section__body">
    <div class="repeater" id="modulos-repeater">
      ${mods.map((m, idx) => moduleItemHtml(m, idx)).join("")}
    </div>
    <button type="button" class="btn btn--ghost btn--sm" id="add-modulo">+ Adicionar módulo</button>
  </div></details>`;
}

function moduleItemHtml(m, idx) {
  return `<div class="repeater-item" data-modulo-idx="${idx}">
    <div class="repeater-item__head"><span>Módulo ${idx + 1}</span><button type="button" class="btn btn--ghost btn--sm" data-remove-modulo="${idx}">Remover</button></div>
    <div class="form-group"><label>Título</label><input name="modulo_titulo_${idx}" value="${escapeHtml(m.titulo || "")}"></div>
    <div class="form-group"><label>Itens (um por linha)</label><textarea name="modulo_itens_${idx}" rows="3">${escapeHtml((m.itens || []).join("\n"))}</textarea></div>
  </div>`;
}

function renderAudienceSection(c) {
  const items = c.publico_alvo || [{}, {}, {}, {}];
  while (items.length < 4) items.push({});
  return `<details class="section"><summary>Esse curso é para quem</summary><div class="section__body">
    <div class="tabs" role="tablist">
      ${[0,1,2,3].map((i) => `<button type="button" class="tab ${i === 0 ? "active" : ""}" data-tab="aud-${i}">Bloco ${i + 1}</button>`).join("")}
      <button type="button" class="tab" data-tab="aud-comp">Seção complementar</button>
    </div>
    ${[0,1,2,3].map((i) => `<div class="tab-panel ${i === 0 ? "active" : ""}" id="aud-${i}">
      <div class="form-grid">
        <div class="form-group"><label>Imagem</label><input name="publico_imagem_${i}" value="${escapeHtml(items[i]?.imagem || "")}"></div>
        <div class="form-group"><label>Título</label><input name="publico_titulo_${i}" value="${escapeHtml(items[i]?.titulo || "")}"></div>
        <div class="form-group form-group--full"><label>Texto</label><textarea name="publico_texto_${i}">${escapeHtml(items[i]?.texto || "")}</textarea></div>
      </div>
    </div>`).join("")}
    <div class="tab-panel" id="aud-comp">
      <div class="form-grid">
        <div class="form-group form-group--full"><label>Imagem complementar</label><input name="secao_complementar_imagem" value="${escapeHtml(c.secao_complementar?.imagem || "")}"></div>
        <small>Dimensões: 2560×360px (desktop) e 1080×470px (mobile)</small>
      </div>
    </div>
  </div></details>`;
}

function renderInvestmentSection(c) {
  const inv = c.investimento || {};
  return `<details class="section"><summary>Investimento</summary><div class="section__body form-grid">
    <div class="form-group"><label>Label da oferta</label><input name="inv_oferta_label" value="${escapeHtml(inv.oferta_label || "")}"></div>
    <div class="form-group"><label>Valor (parcelas)</label><input name="inv_oferta_valor" value="${escapeHtml(inv.oferta_valor || "")}"></div>
    <div class="form-group"><label>Taxa de inscrição</label><input name="inv_taxa" value="${escapeHtml(inv.taxa_inscricao || "")}"></div>
    <div class="form-group"><label>Texto do botão</label><input name="inv_texto_botao" value="${escapeHtml(inv.texto_botao || "")}"></div>
    <div class="form-group form-group--full"><label>Link do botão</label><input name="inv_link_botao" value="${escapeHtml(inv.link_botao || "")}"></div>
    <div class="form-group form-group--full"><label>Matrícula (HTML)</label><textarea name="inv_matricula">${escapeHtml(inv.matricula_html || "")}</textarea></div>
    <div class="form-group form-group--full"><label>Parcelas (HTML)</label><textarea name="inv_parcelas">${escapeHtml(inv.parcelas_html || "")}</textarea></div>
    <div class="form-group form-group--full"><label>Benefícios (um por linha)</label><textarea name="inv_beneficios" rows="5">${escapeHtml((inv.beneficios || []).join("\n"))}</textarea></div>
  </div></details>`;
}

function renderFaqSection(c) {
  const faqs = c.faq || [];
  return `<details class="section"><summary>FAQ (${faqs.length})</summary><div class="section__body">
    <div class="repeater" id="faq-repeater">
      ${faqs.map((f, idx) => faqItemHtml(f, idx)).join("")}
    </div>
    <button type="button" class="btn btn--ghost btn--sm" id="add-faq">+ Adicionar pergunta</button>
  </div></details>`;
}

function faqItemHtml(f, idx) {
  return `<div class="repeater-item" data-faq-idx="${idx}">
    <div class="repeater-item__head"><span>Pergunta ${idx + 1}</span><button type="button" class="btn btn--ghost btn--sm" data-remove-faq="${idx}">Remover</button></div>
    <div class="form-group"><label>Pergunta</label><input name="faq_pergunta_${idx}" value="${escapeHtml(f.pergunta || "")}"></div>
    <div class="form-group"><label>Resposta</label><textarea name="faq_resposta_${idx}" rows="2">${escapeHtml(f.resposta || "")}</textarea></div>
  </div>`;
}

function renderSeoSection(c, seo, seoResult) {
  return `<details class="section" open><summary>SEO — ${seoResult.score}/100</summary><div class="section__body">
    <div class="seo-score">
      <div class="seo-score__circle">${seoResult.score}</div>
      <div>
        <strong>Otimização automática</strong>
        <p style="margin:.25rem 0;font-size:.85rem;color:var(--muted)">Campos gerados com base no título, nível e status. Edite manualmente se necessário.</p>
        <button type="button" class="btn btn--ghost btn--sm" id="btn-auto-seo">Regenerar SEO</button>
      </div>
    </div>
    <ul style="margin:0 0 1rem;padding-left:1.25rem;font-size:.85rem;">
      ${seoResult.checks.map((ch) => `<li style="color:${ch.ok ? "var(--success)" : "var(--muted)"}">${escapeHtml(ch.text)}</li>`).join("")}
    </ul>
    <div class="form-grid">
      <div class="form-group form-group--full"><label>Meta Title</label><input name="seo_title" value="${escapeHtml(seo.title || "")}" maxlength="60"><small><span id="seo-title-len">${(seo.title || "").length}</span>/60</small></div>
      <div class="form-group form-group--full"><label>Meta Description</label><textarea name="seo_description" maxlength="160" rows="2">${escapeHtml(seo.description || "")}</textarea><small><span id="seo-desc-len">${(seo.description || "").length}</span>/160</small></div>
      <div class="form-group"><label>Focus Keyword</label><input name="seo_focus" value="${escapeHtml(seo.focus_keyword || "")}"></div>
      <div class="form-group"><label>Keywords (vírgula)</label><input name="seo_keywords" value="${escapeHtml((seo.keywords || []).join(", "))}"></div>
      <div class="form-group form-group--full"><label>URL Canônica</label><input name="seo_canonical" value="${escapeHtml(seo.canonical || "")}"></div>
    </div>
    <div id="seo-preview">${renderSeoPreview(seo)}</div>
  </div></details>`;
}

function emptyCourse() {
  return {
    id: uid("course"),
    slug: "",
    publicado: false,
    titulo: "",
    subtitulo: "",
    imagem_capa: "",
    nivel_formacao_id: "pos-graduacao",
    area_id: "",
    status_curso_id: "inscricoes-abertas",
    coordenacao_ids: [],
    professor_ids: [],
    depoimento_texto_ids: [],
    depoimento_video_ids: [],
    depoimento_imagem_ids: [],
    hero: {},
    informacoes: {},
    sobre: { paragrafos: [] },
    modulos: [],
    publico_alvo: [{}, {}, {}, {}],
    secao_complementar: {},
    investimento: { beneficios: [] },
    faq: [],
    seo: {},
  };
}

function renderEntityList(collection, title, formRenderer) {
  setPage(title, `Cadastro de ${title.toLowerCase()}`);
  const items = getAll(collection);
  return `
    <div class="panel">
      <div class="panel__head"><h2>${title}</h2><button type="button" class="btn btn--primary btn--sm" id="btn-new-entity">+ Adicionar</button></div>
      <div class="panel__body table-wrap">
        <table><thead><tr><th>Nome</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${items.map((item) => `<tr>
          <td><strong>${escapeHtml(item.nome)}</strong></td>
          <td>${item.ativo !== false ? '<span class="badge badge--live">Ativo</span>' : '<span class="badge badge--draft">Inativo</span>'}</td>
          <td class="table-actions">
            <button type="button" class="btn btn--ghost btn--sm" data-edit-entity="${item.id}">Editar</button>
            <button type="button" class="btn btn--ghost btn--sm" data-delete-entity="${item.id}">Excluir</button>
          </td>
        </tr>`).join("") || `<tr><td colspan="3" class="empty">Nenhum registro.</td></tr>`}
        </tbody></table>
      </div>
    </div>
    <div id="entity-modal" hidden></div>`;
}

function renderProfessorForm(item) {
  const p = item || { id: uid("prof"), nome: "", foto: "", titulo: "", estado: "", ativo: true };
  return entityFormShell("Professores", p, `
    <div class="form-grid">
      <div class="form-group form-group--full"><label>Nome *</label><input name="nome" value="${escapeHtml(p.nome)}" required></div>
      <div class="form-group"><label>Título / Cargo</label><input name="titulo" value="${escapeHtml(p.titulo || "")}"></div>
      <div class="form-group"><label>Estado (UF)</label><input name="estado" value="${escapeHtml(p.estado || "")}"></div>
      <div class="form-group form-group--full"><label>Foto (caminho)</label><input name="foto" value="${escapeHtml(p.foto || "")}"></div>
      <div class="form-group"><label class="form-check"><input type="checkbox" name="ativo" ${p.ativo !== false ? "checked" : ""}> Ativo</label></div>
    </div>`);
}

function renderCoordForm(item) {
  const p = item || { id: uid("coord"), nome: "", foto: "", cargo: "", mini_curriculo: [], ativo: true };
  return entityFormShell("Coordenação", p, `
    <div class="form-grid">
      <div class="form-group form-group--full"><label>Nome *</label><input name="nome" value="${escapeHtml(p.nome)}" required></div>
      <div class="form-group form-group--full"><label>Cargo / Resumo</label><input name="cargo" value="${escapeHtml(p.cargo || "")}"></div>
      <div class="form-group form-group--full"><label>Foto</label><input name="foto" value="${escapeHtml(p.foto || "")}"></div>
      <div class="form-group form-group--full"><label>Mini-currículo (um item por linha)</label><textarea name="mini_curriculo" rows="5">${escapeHtml((p.mini_curriculo || []).join("\n"))}</textarea></div>
      <div class="form-group"><label class="form-check"><input type="checkbox" name="ativo" ${p.ativo !== false ? "checked" : ""}> Ativo</label></div>
    </div>`);
}

function renderTestimonialTextForm(item) {
  const p = item || { id: uid("dep-text"), nome: "", profissao: "", texto: "", ativo: true };
  return entityFormShell("Depoimento (texto)", p, `
    <div class="form-grid">
      <div class="form-group"><label>Nome *</label><input name="nome" value="${escapeHtml(p.nome)}" required></div>
      <div class="form-group"><label>Profissão / Curso</label><input name="profissao" value="${escapeHtml(p.profissao || "")}"></div>
      <div class="form-group form-group--full"><label>Depoimento *</label><textarea name="texto" rows="4" required>${escapeHtml(p.texto || "")}</textarea></div>
      <div class="form-group"><label class="form-check"><input type="checkbox" name="ativo" ${p.ativo !== false ? "checked" : ""}> Ativo</label></div>
    </div>`);
}

function renderTestimonialVideoForm(item) {
  const p = item || { id: uid("dep-vid"), nome: "", video_url: "", thumbnail: "", ativo: true };
  return entityFormShell("Depoimento (vídeo)", p, `
    <div class="form-grid">
      <div class="form-group form-group--full"><label>Nome *</label><input name="nome" value="${escapeHtml(p.nome)}" required></div>
      <div class="form-group form-group--full"><label>URL do vídeo (YouTube) *</label><input name="video_url" value="${escapeHtml(p.video_url || "")}" required></div>
      <div class="form-group form-group--full"><label>Thumbnail</label><input name="thumbnail" value="${escapeHtml(p.thumbnail || "")}"></div>
      <div class="form-group"><label class="form-check"><input type="checkbox" name="ativo" ${p.ativo !== false ? "checked" : ""}> Ativo</label></div>
    </div>`);
}

function renderTestimonialImageForm(item) {
  const p = item || { id: uid("dep-img"), nome: "", imagem: "", legenda: "", ativo: true };
  return entityFormShell("Depoimento (imagem)", p, `
    <div class="form-grid">
      <div class="form-group form-group--full"><label>Nome *</label><input name="nome" value="${escapeHtml(p.nome)}" required></div>
      <div class="form-group form-group--full"><label>Imagem</label><input name="imagem" value="${escapeHtml(p.imagem || "")}"></div>
      <div class="form-group form-group--full"><label>Legenda</label><input name="legenda" value="${escapeHtml(p.legenda || "")}"></div>
      <div class="form-group"><label class="form-check"><input type="checkbox" name="ativo" ${p.ativo !== false ? "checked" : ""}> Ativo</label></div>
    </div>`);
}

function entityFormShell(title, item, fieldsHtml) {
  return `
    <div class="panel" id="entity-form-panel">
      <div class="panel__head"><h2>${item.nome ? `Editar: ${escapeHtml(item.nome)}` : `Novo — ${title}`}</h2></div>
      <div class="panel__body">
        <form id="entity-form" data-entity-id="${item.id}">
          ${fieldsHtml}
          <div class="form-actions">
            <button type="button" class="btn btn--ghost" id="cancel-entity">Cancelar</button>
            <button type="submit" class="btn btn--primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>`;
}

function renderTaxonomy(collection, title, allowAdd) {
  setPage(title, allowAdd ? "Adicione ou edite categorias" : "Status fixos do curso");
  const items = getAll(collection);
  return `
    <div class="panel">
      <div class="panel__head"><h2>${title}</h2></div>
      <div class="panel__body">
        ${!allowAdd ? `<p style="font-size:.875rem;color:var(--muted);margin:0 0 1rem;">Os três status são fixos: Inscrições Abertas, Turma Confirmada e Inscrições Encerradas.</p>` : ""}
        <table><thead><tr><th>Nome</th><th>Slug</th>${allowAdd ? "<th>Ações</th>" : ""}</tr></thead>
        <tbody>${items.map((item) => `<tr>
          <td><strong>${escapeHtml(item.nome)}</strong></td>
          <td><code>${escapeHtml(item.slug || item.id)}</code></td>
          ${allowAdd ? `<td class="table-actions">
            <button type="button" class="btn btn--ghost btn--sm" data-edit-tax="${item.id}">Editar</button>
            <button type="button" class="btn btn--ghost btn--sm" data-delete-tax="${item.id}">Excluir</button>
          </td>` : `<td>—</td>`}
        </tr>`).join("")}</tbody></table>
        ${allowAdd ? `
          <form id="tax-form" style="margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border)">
            <div class="form-grid">
              <div class="form-group"><label>Nome</label><input name="nome" required placeholder="Ex: Graduação"></div>
              <div class="form-group"><label>Slug</label><input name="slug" placeholder="auto"></div>
            </div>
            <div class="form-actions" style="border:none;margin:0;padding-top:.75rem">
              <button type="submit" class="btn btn--primary btn--sm">+ Adicionar nível</button>
            </div>
          </form>` : ""}
      </div>
    </div>
    <div id="tax-edit" hidden></div>`;
}

function getCheckedIds(form, name) {
  return $$(`input[name="${name}"]:checked`, form).map((el) => el.value);
}

function collectCourseForm(form) {
  const existing = editId && editId !== "novo" ? getById("courses", editId) : null;
  const titulo = form.titulo.value.trim();
  const slug = form.slug.value.trim() || slugify(titulo);

  const modulos = [];
  $$("[data-modulo-idx]", form).forEach((el) => {
    const idx = el.dataset.moduloIdx;
    modulos.push({
      titulo: form[`modulo_titulo_${idx}`]?.value.trim() || "",
      itens: (form[`modulo_itens_${idx}`]?.value || "").split("\n").map((s) => s.trim()).filter(Boolean),
    });
  });

  const faq = [];
  $$("[data-faq-idx]", form).forEach((el) => {
    const idx = el.dataset.faqIdx;
    const pergunta = form[`faq_pergunta_${idx}`]?.value.trim();
    const resposta = form[`faq_resposta_${idx}`]?.value.trim();
    if (pergunta) faq.push({ pergunta, resposta });
  });

  const publico_alvo = [0, 1, 2, 3].map((i) => ({
    imagem: form[`publico_imagem_${i}`]?.value.trim() || "",
    titulo: form[`publico_titulo_${i}`]?.value.trim() || "",
    texto: form[`publico_texto_${i}`]?.value.trim() || "",
  }));

  const course = {
    ...(existing || emptyCourse()),
    id: existing?.id || slug || uid("course"),
    slug,
    publicado: form.publicado?.checked || false,
    titulo,
    subtitulo: form.subtitulo.value.trim(),
    imagem_capa: form.imagem_capa.value.trim(),
    nivel_formacao_id: form.nivel_formacao_id.value,
    area_id: form.area_id.value,
    status_curso_id: form.status_curso_id.value,
    coordenacao_ids: getCheckedIds(form, "coordenacao_ids"),
    professor_ids: getCheckedIds(form, "professor_ids"),
    depoimento_texto_ids: getCheckedIds(form, "depoimento_texto_ids"),
    depoimento_video_ids: getCheckedIds(form, "depoimento_video_ids"),
    depoimento_imagem_ids: getCheckedIds(form, "depoimento_imagem_ids"),
    hero: {
      texto_botao: form.hero_texto_botao?.value.trim(),
      link_botao: form.hero_link_botao?.value.trim(),
    },
    informacoes: {
      carga_horaria: form.info_carga_horaria?.value.trim(),
      duracao: form.info_duracao?.value.trim(),
      inicio_previsto: form.info_inicio_previsto?.value.trim(),
      modalidade: form.info_modalidade?.value.trim(),
      vagas: form.info_vagas?.value.trim(),
      aulas: form.info_aulas?.value.trim(),
      video: form.info_video?.value.trim(),
      ultimas_vagas: form.info_ultimas_vagas?.value === "true",
      confirmado: form.info_confirmado?.value === "true",
      pre_inscricao: form.info_pre_inscricao?.value === "true",
    },
    sobre: {
      tag: form.sobre_tag?.value.trim(),
      paragrafos: [form.sobre_p1?.value.trim(), form.sobre_p2?.value.trim()].filter(Boolean),
    },
    matriz_curricular: form.matriz_curricular?.value.trim(),
    destaques: form.destaques?.value.trim(),
    objetivos: form.objetivos?.value.trim(),
    modulos,
    publico_alvo,
    secao_complementar: { imagem: form.secao_complementar_imagem?.value.trim() || "" },
    investimento: {
      oferta_label: form.inv_oferta_label?.value.trim(),
      oferta_valor: form.inv_oferta_valor?.value.trim(),
      taxa_inscricao: form.inv_taxa?.value.trim(),
      texto_botao: form.inv_texto_botao?.value.trim(),
      link_botao: form.inv_link_botao?.value.trim(),
      matricula_html: form.inv_matricula?.value.trim(),
      parcelas_html: form.inv_parcelas?.value.trim(),
      beneficios: (form.inv_beneficios?.value || "").split("\n").map((s) => s.trim()).filter(Boolean),
    },
    faq,
    seo: {
      title: form.seo_title?.value.trim(),
      description: form.seo_description?.value.trim(),
      og_title: form.seo_title?.value.trim(),
      og_description: form.seo_description?.value.trim(),
      focus_keyword: form.seo_focus?.value.trim(),
      keywords: (form.seo_keywords?.value || "").split(",").map((s) => s.trim()).filter(Boolean),
      canonical: form.seo_canonical?.value.trim() || `/pos-graduacao/${slug}`,
      schema_type: "Course",
    },
    atualizado_em: new Date().toISOString(),
  };

  if (course.id !== slug && !existing) course.id = slug;
  return course;
}

function bindEvents() {
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const panel = tab.dataset.tab;
      tab.closest(".section__body")?.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.closest(".section__body")?.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(panel)?.classList.add("active");
    });
  });

  const courseForm = $("#course-form");
  if (courseForm) {
    courseForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const course = collectCourseForm(courseForm);
        await upsertItem("courses", course);
        toast("Curso salvo com sucesso!");
        location.hash = `#/courses/${course.id}`;
        await navigate();
      } catch (err) {
        toast(err.message, "error");
      }
    });

    $("#titulo")?.addEventListener("input", (e) => {
      const slugEl = $("#slug");
      if (!slugEl.value || slugEl.dataset.auto !== "false") {
        const s = slugify(e.target.value);
        slugEl.value = s;
        $("#slug-preview").textContent = s || "slug-do-curso";
      }
    });

    $("#btn-auto-seo")?.addEventListener("click", () => {
      const partial = collectCourseForm(courseForm);
      const seo = generateCourseSeo(
        partial,
        lookup("formation-levels", partial.nivel_formacao_id),
        lookup("areas", partial.area_id),
        lookup("statuses", partial.status_curso_id),
      );
      courseForm.seo_title.value = seo.title;
      courseForm.seo_description.value = seo.description;
      courseForm.seo_focus.value = seo.focus_keyword;
      courseForm.seo_keywords.value = seo.keywords.join(", ");
      courseForm.seo_canonical.value = seo.canonical;
      $("#seo-preview").innerHTML = renderSeoPreview(seo);
      toast("SEO regenerado!");
    });
  }

  $$("[data-delete-course]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir este curso?")) return;
      await deleteItem("courses", btn.dataset.deleteCourse);
      toast("Curso excluído");
      navigate();
    });
  });

  bindEntityEvents();
  bindTaxonomyEvents();
}

function bindEntityEvents() {
  const collection = currentRoute;
  if (!["professors", "coordination", "testimonials-text", "testimonials-video", "testimonials-image"].includes(collection)) return;

  const formRenderers = {
    professors: renderProfessorForm,
    coordination: renderCoordForm,
    "testimonials-text": renderTestimonialTextForm,
    "testimonials-video": renderTestimonialVideoForm,
    "testimonials-image": renderTestimonialImageForm,
  };

  $("#btn-new-entity")?.addEventListener("click", () => {
    const html = formRenderers[collection](null);
    $("#content").insertAdjacentHTML("beforeend", html);
    bindEntityForm(collection);
  });

  $$("[data-edit-entity]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = getById(collection, btn.dataset.editEntity);
      const html = formRenderers[collection](item);
      $("#content").insertAdjacentHTML("beforeend", html);
      bindEntityForm(collection);
      $("#entity-form-panel")?.scrollIntoView({ behavior: "smooth" });
    });
  });

  $$("[data-delete-entity]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir registro?")) return;
      await deleteItem(collection, btn.dataset.deleteEntity);
      toast("Registro excluído");
      navigate();
    });
  });
}

function bindEntityForm(collection) {
  $("#cancel-entity")?.addEventListener("click", () => {
    $("#entity-form-panel")?.remove();
  });

  $("#entity-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const id = form.dataset.entityId;
    const existing = getById(collection, id);
    const data = { ...(existing || {}), id };

    const fd = new FormData(form);
    for (const [key, val] of fd.entries()) {
      if (key === "ativo") data.ativo = true;
      else if (key === "mini_curriculo") data[key] = val.split("\n").map((s) => s.trim()).filter(Boolean);
      else data[key] = val;
    }
    if (!fd.has("ativo")) data.ativo = false;
    if (!data.nome?.trim()) return toast("Nome obrigatório", "error");

    try {
      await upsertItem(collection, data);
      toast("Salvo!");
      $("#entity-form-panel")?.remove();
      navigate();
    } catch (err) {
      toast(err.message, "error");
    }
  });
}

function bindTaxonomyEvents() {
  if (!["areas", "formation-levels"].includes(currentRoute)) return;

  $("#tax-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const nome = form.nome.value.trim();
    const slug = form.slug.value.trim() || slugify(nome);
    const item = { id: slug, nome, slug };
    try {
      await upsertItem(currentRoute, item);
      toast("Adicionado!");
      navigate();
    } catch (err) {
      toast(err.message, "error");
    }
  });

  $$("[data-delete-tax]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir? Cursos vinculados podem ficar inconsistentes.")) return;
      await deleteItem(currentRoute, btn.dataset.deleteTax);
      toast("Excluído");
      navigate();
    });
  });
}

function showLogin() {
  $("#login-screen").hidden = false;
  $("#app").hidden = true;
}

function showApp() {
  $("#login-screen").hidden = true;
  $("#app").hidden = false;
  const user = getUser();
  if (user) {
    const sub = $("#page-subtitle");
    if (sub) sub.textContent = `Olá, ${user} — gerencie cursos e conteúdos do site`;
  }
}

async function boot() {
  const loginForm = $("#login-form");
  const loginError = $("#login-error");

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    const fd = new FormData(loginForm);
    try {
      await login(fd.get("username"), fd.get("password"));
      showApp();
      await startApp();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.hidden = false;
    }
  });

  $("#btn-logout")?.addEventListener("click", async () => {
    await logout();
    showLogin();
    loginForm?.reset();
  });

  window.addEventListener("cms:unauthorized", () => {
    showLogin();
    loginError.textContent = "Sessão expirada. Entre novamente.";
    loginError.hidden = false;
  });

  if (isAuthenticated() && await verifySession()) {
    showApp();
    await startApp();
  } else {
    showLogin();
  }
}

let appStarted = false;

async function startApp() {
  if (!appStarted) {
    appStarted = true;
    $("#btn-export").addEventListener("click", exportAll);
    window.addEventListener("hashchange", navigate);
  }

  loadFromLocalStorage();
  const result = await initStore();
  const sync = $("#sync-status");
  if (result.source === "api") {
    sync.textContent = "● Conectado — alterações salvas em data/cms/";
    sync.style.color = "var(--success)";
  } else {
    sync.textContent = "○ Use npm run cms para editar com login";
    sync.style.color = "var(--muted)";
  }

  navigate();
}

boot();
