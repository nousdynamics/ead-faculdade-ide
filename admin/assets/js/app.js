import {
  initStore, getAll, getById, lookup, upsertItem, deleteItem,
  uid, slugify, loadFromLocalStorage,
} from "./store.js";
import { generateCourseSeo, scoreSeo, renderSeoPreview, escapeHtml, SEO_LIMITS } from "./seo.js";
import { login, logout, verifySession, isAuthenticated, getUser, getEmail, fetchAccountProfile, updateAccount } from "./auth.js";
import { icon, navIcon, statIcon } from "./icons.js";
import { bindImageUpload, mediaUrl } from "./upload.js";
import {
  enterAdminFromLogin,
  transitionPage,
} from "./motion.js";

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const NAV = [
  { group: "Principal" },
  { route: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { route: "courses", label: "Cursos", icon: "graduation-cap" },
  { group: "Conteúdo" },
  { route: "professors", label: "Professores", icon: "users" },
  { route: "coordination", label: "Coordenação", icon: "user-cog" },
  { route: "testimonials", label: "Depoimentos", icon: "message-square-quote" },
  { group: "Configurações" },
  { route: "areas", label: "Áreas", icon: "layout-grid" },
  { route: "formation-levels", label: "Níveis de formação", icon: "layers" },
  { route: "statuses", label: "Status do curso", icon: "circle-dot" },
  { group: "Conta" },
  { route: "account", label: "Configurações de conta", icon: "settings" },
  { action: "logout", label: "Sair", icon: "log-out" },
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
    if (item.action === "logout") {
      return `<button type="button" class="nav-logout" data-action="logout"><span class="nav-icon">${navIcon(item.icon)}</span><span class="nav-label">${item.label}</span></button>`;
    }
    const active = currentRoute === item.route || (item.route === "courses" && currentRoute.startsWith("course"));
    return `<a href="#/${item.route}" class="${active ? "active" : ""}" data-route="${item.route}"><span class="nav-icon">${navIcon(item.icon)}</span><span class="nav-label">${item.label}</span></a>`;
  }).join("");
}

function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, "") || "dashboard";
  const parts = hash.split("/");
  return { route: parts[0], id: parts[1] || null };
}

async function navigate() {
  const { route, id } = parseRoute();

  if (route === "testimonials-text" || route === "testimonials-video" || route === "testimonials-image") {
    location.replace("#/testimonials");
    return;
  }

  currentRoute = route;
  editId = id;
  renderNav();

  const content = $("#content");

  await transitionPage(content, async () => {
    try {
      if (route === "dashboard") content.innerHTML = renderDashboard();
      else if (route === "courses" && !id) content.innerHTML = renderCoursesList();
      else if (route === "courses" && id === "novo") content.innerHTML = renderCourseForm(null);
      else if (route === "courses" && id) content.innerHTML = renderCourseForm(getById("courses", id));
      else if (route === "professors") content.innerHTML = renderEntityList("professors", "Professores", renderProfessorForm);
      else if (route === "coordination") content.innerHTML = renderEntityList("coordination", "Coordenação pedagógica", renderCoordForm);
      else if (route === "testimonials") content.innerHTML = renderTestimonialsList();
      else if (route === "areas") content.innerHTML = renderTaxonomy("areas", "Áreas", true);
      else if (route === "formation-levels") content.innerHTML = renderTaxonomy("formation-levels", "Níveis de formação", true);
      else if (route === "statuses") content.innerHTML = renderTaxonomy("statuses", "Status do curso", false);
      else if (route === "account") {
        let profile = { user: getUser(), email: getEmail() };
        try {
          profile = await fetchAccountProfile();
        } catch { /* modo offline */ }
        content.innerHTML = renderAccount(profile);
      }
      else content.innerHTML = renderDashboard();
      bindEvents();
    } catch (err) {
      content.innerHTML = `<div class="panel"><div class="panel__body empty"><p>Erro ao carregar: ${escapeHtml(err.message)}</p></div></div>`;
    }
  });
}

function renderAccount(profile) {
  setPage("Configurações de conta", "Gerencie e-mail, senha e acesso ao painel");

  return `
    <div class="account-grid">
      <div class="panel">
        <div class="panel__head"><h2>${icon("mail", { size: 18 })} E-mail</h2></div>
        <div class="panel__body">
          <form id="account-email-form" class="account-form">
            <div class="form-group">
              <label for="account-user">Usuário</label>
              <input id="account-user" value="${escapeHtml(profile.user || getUser())}" disabled>
            </div>
            <div class="form-group">
              <label for="account-email">E-mail</label>
              <input type="email" id="account-email" name="email" value="${escapeHtml(profile.email || "")}" placeholder="voce@faculdadeide.edu.br" autocomplete="email">
              <small>Usado para contato e recuperação de acesso da equipe.</small>
            </div>
            <p class="account-form__error" id="account-email-error" hidden></p>
            <button type="submit" class="btn btn--primary">${icon("save", { size: 16 })} Salvar e-mail</button>
          </form>
        </div>
      </div>

      <div class="panel">
        <div class="panel__head"><h2>${icon("key-round", { size: 18 })} Alterar senha</h2></div>
        <div class="panel__body">
          <form id="account-password-form" class="account-form">
            <div class="form-group">
              <label for="account-current-pass">Senha atual</label>
              <input type="password" id="account-current-pass" name="currentPassword" autocomplete="current-password" required>
            </div>
            <div class="form-group">
              <label for="account-new-pass">Nova senha</label>
              <input type="password" id="account-new-pass" name="newPassword" minlength="8" autocomplete="new-password" required>
              <small>Mínimo de 8 caracteres.</small>
            </div>
            <div class="form-group">
              <label for="account-confirm-pass">Confirmar nova senha</label>
              <input type="password" id="account-confirm-pass" name="confirmPassword" minlength="8" autocomplete="new-password" required>
            </div>
            <p class="account-form__error" id="account-password-error" hidden></p>
            <button type="submit" class="btn btn--primary">${icon("save", { size: 16 })} Atualizar senha</button>
          </form>
        </div>
      </div>

      <div class="panel panel--danger">
        <div class="panel__head"><h2>${icon("log-out", { size: 18 })} Encerrar sessão</h2></div>
        <div class="panel__body">
          <p class="account-logout__text">Desconecte-se do painel CMS neste dispositivo.</p>
          <button type="button" class="btn btn--ghost btn--danger-outline" id="btn-logout-account">${icon("log-out", { size: 16 })} Sair do painel</button>
        </div>
      </div>
    </div>`;
}

function renderDashboard() {
  setPage("Dashboard", "Visão geral do conteúdo");
  const courses = getAll("courses");
  const published = courses.filter((c) => c.publicado);
  const open = courses.filter((c) => c.status_curso_id === "inscricoes-abertas");

  return `
    <div class="stats">
      <div class="stat-card stat-card--courses">
        <div class="stat-card__icon">${statIcon("graduation-cap")}</div>
        <div><div class="stat-card__value">${courses.length}</div><div class="stat-card__label">Cursos cadastrados</div></div>
      </div>
      <div class="stat-card stat-card--published">
        <div class="stat-card__icon">${statIcon("check-circle")}</div>
        <div><div class="stat-card__value">${published.length}</div><div class="stat-card__label">Publicados</div></div>
      </div>
      <div class="stat-card stat-card--open">
        <div class="stat-card__icon">${statIcon("globe-2")}</div>
        <div><div class="stat-card__value">${open.length}</div><div class="stat-card__label">Inscrições abertas</div></div>
      </div>
      <div class="stat-card stat-card--professors">
        <div class="stat-card__icon">${statIcon("users")}</div>
        <div><div class="stat-card__value">${getAll("professors").length}</div><div class="stat-card__label">Professores</div></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel__head"><h2>${icon("book-open", { size: 18 })} Últimos cursos</h2><a href="#/courses/novo" class="btn btn--primary btn--sm">${icon("plus", { size: 16 })} Novo curso</a></div>
      <div class="panel__body panel__body--flush table-wrap">
        ${courses.length ? `<table class="data-table data-table--courses">
          <thead><tr><th class="col-title">Curso</th><th class="col-meta">Nível</th><th class="col-meta">Área</th><th class="col-status">Status</th><th class="col-actions"></th></tr></thead>
          <tbody>${courses.slice(0, 8).map((c) => `<tr>
            <td class="col-title"><span class="cell-name__title">${escapeHtml(c.titulo)}</span></td>
            <td class="col-meta">${escapeHtml(lookup("formation-levels", c.nivel_formacao_id))}</td>
            <td class="col-meta">${escapeHtml(lookup("areas", c.area_id))}</td>
            <td class="col-status">${statusBadge(c.status_curso_id)}</td>
            <td class="col-actions"><div class="table-actions"><a href="#/courses/${c.id}" class="btn btn--ghost btn--sm">${icon("pencil", { size: 14 })} Editar</a></div></td>
          </tr>`).join("")}</tbody>
        </table>` : `<div class="empty">${icon("inbox", { size: 40, className: "icon empty__icon" })}<p>Nenhum curso cadastrado.</p><a href="#/courses/novo" class="btn btn--primary">${icon("plus", { size: 16 })} Criar primeiro curso</a></div>`}
      </div>
    </div>`;
}

function renderCoursesList() {
  setPage("Cursos", "Gerencie todas as pós-graduações e cursos");
  const courses = getAll("courses");
  return `
    <div class="panel">
      <div class="panel__head">
        <h2>${icon("folder-open", { size: 18 })} Todos os cursos (${courses.length})</h2>
        <a href="#/courses/novo" class="btn btn--primary">${icon("plus", { size: 16 })} Novo curso</a>
      </div>
      <div class="panel__body panel__body--flush table-wrap">
        <table class="data-table data-table--courses">
          <thead><tr><th class="col-title">Título</th><th class="col-slug">Slug</th><th class="col-meta">Nível</th><th class="col-status">Status</th><th class="col-published">Publicado</th><th class="col-actions">Ações</th></tr></thead>
          <tbody>
            ${courses.map((c) => `<tr>
              <td class="col-title">
                <span class="cell-name__title">${escapeHtml(c.titulo)}</span>
                ${c.subtitulo ? `<span class="cell-muted">${escapeHtml(c.subtitulo.slice(0, 60))}${c.subtitulo.length > 60 ? "…" : ""}</span>` : ""}
              </td>
              <td class="col-slug"><code>${escapeHtml(c.slug)}</code></td>
              <td class="col-meta">${escapeHtml(lookup("formation-levels", c.nivel_formacao_id))}</td>
              <td class="col-status">${statusBadge(c.status_curso_id)}</td>
              <td class="col-published">${c.publicado ? '<span class="badge badge--live">Sim</span>' : '<span class="badge badge--draft">Rascunho</span>'}</td>
              <td class="col-actions">
                <div class="table-actions">
                  <a href="#/courses/${c.id}" class="btn btn--ghost btn--sm">${icon("pencil", { size: 14 })} Editar</a>
                  <button type="button" class="btn btn--ghost btn--sm btn--danger-outline" data-delete-course="${c.id}">${icon("trash", { size: 14 })} Excluir</button>
                </div>
              </td>
            </tr>`).join("") || `<tr><td colspan="6" class="empty">Nenhum curso.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}

function getCourseDepoimentoIds(course) {
  if (course?.depoimento_ids?.length) return course.depoimento_ids;
  return [
    ...(course?.depoimento_texto_ids || []),
    ...(course?.depoimento_video_ids || []),
    ...(course?.depoimento_imagem_ids || []),
  ];
}

function testimonialTypeLabel(tipo) {
  return ({ texto: "Texto", video: "Vídeo", imagem: "Imagem" })[tipo] || tipo || "—";
}

function testimonialTypeBadge(tipo) {
  const map = {
    texto: "badge--open",
    video: "badge--confirmed",
    imagem: "badge--live",
  };
  const cls = map[tipo] || "badge--draft";
  return `<span class="badge ${cls}">${escapeHtml(testimonialTypeLabel(tipo))}</span>`;
}

function testimonialSummary(item) {
  if (item.tipo === "video") return item.video_url || "Sem URL de vídeo";
  if (item.tipo === "imagem") return item.legenda || item.imagem || "Sem imagem";
  const text = item.texto || "";
  return text ? `${text.slice(0, 72)}${text.length > 72 ? "…" : ""}` : "Sem texto";
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
            ${escapeHtml(item.nome)}${collection === "testimonials" ? ` <small class="form-check__meta">(${escapeHtml(testimonialTypeLabel(item.tipo))})</small>` : ""}
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

function coursePanel(id, title, description, content) {
  return `
    <section class="panel course-section" id="${id}">
      <div class="panel__head course-section__head">
        <div>
          <h2>${title}</h2>
          ${description ? `<p class="course-section__desc">${description}</p>` : ""}
        </div>
      </div>
      <div class="panel__body">${content}</div>
    </section>`;
}

function renderCourseFormNav() {
  const links = [
    ["cf-basics", "Informações básicas", "file-text"],
    ["cf-apresentacao", "Apresentação", "layout"],
    ["cf-equipe", "Equipe e depoimentos", "users"],
    ["cf-conteudo", "Sobre o curso", "book-open"],
    ["cf-grade", "Grade curricular", "list"],
    ["cf-publico", "Público-alvo", "target"],
    ["cf-investimento", "Investimento", "credit-card"],
    ["cf-faq", "FAQ", "help-circle"],
    ["cf-seo", "SEO", "search"],
  ];

  return `<nav class="course-form__nav" aria-label="Seções do curso">
    ${links.map(([id, label, ic]) => `<button type="button" class="course-form__nav-link" data-course-jump="${id}">${icon(ic, { size: 16 })}<span>${label}</span></button>`).join("")}
  </nav>`;
}

function renderCourseForm(course) {
  const isNew = !course;
  const c = course || emptyCourse();
  setPage(isNew ? "Novo curso" : `Editar: ${c.titulo}`, "Preencha todas as seções — use o menu lateral para navegar");

  const seo = c.seo || {};
  const seoResult = scoreSeo(seo, c);
  const h = c.hero || {};
  const i = c.informacoes || {};
  const s = c.sobre || {};
  const inv = c.investimento || {};
  const mods = c.modulos || [];
  const faqs = c.faq || [];
  const audience = c.publico_alvo || [];
  while (audience.length < 4) audience.push({});

  return `
    <form id="course-form" class="course-form">
      <div class="course-form__layout">
        ${renderCourseFormNav()}
        <div class="course-form__main">
          ${coursePanel("cf-basics", "Informações básicas", "Identidade, URL e status de publicação do curso.", `
            <div class="form-grid">
              <div class="form-group form-group--full course-form__published">
                <label class="form-check form-check--switch"><input type="checkbox" name="publicado" ${c.publicado ? "checked" : ""}> Curso publicado no site</label>
              </div>
              <div class="form-group form-group--full">
                <label for="titulo">Título *</label>
                <input id="titulo" name="titulo" value="${escapeHtml(c.titulo)}" required placeholder="Ex: Aleitamento Materno e Banco de Leite Humano">
              </div>
              <div class="form-group form-group--full">
                <label for="subtitulo">Subtítulo</label>
                <input id="subtitulo" name="subtitulo" value="${escapeHtml(c.subtitulo || "")}" placeholder="Frase de apoio exibida no hero">
              </div>
              <div class="form-group form-group--full">
                <label for="slug">Slug (URL)</label>
                <input id="slug" name="slug" value="${escapeHtml(c.slug || "")}" placeholder="gerado-automaticamente">
                <small>URL: /pos-graduacao/<strong id="slug-preview">${escapeHtml(c.slug || "slug-do-curso")}</strong></small>
              </div>
              ${renderImageUploadField({ name: "imagem_capa", value: c.imagem_capa || "", label: "Imagem de capa", folder: "courses", dimensions: "1200×630 px recomendado" })}
              ${selectField("nivel_formacao_id", "formation-levels", c.nivel_formacao_id, "Nível de formação", true)}
              ${selectField("area_id", "areas", c.area_id, "Área", true)}
              ${selectField("status_curso_id", "statuses", c.status_curso_id, "Status do curso", true)}
            </div>
          `)}

          ${coursePanel("cf-apresentacao", "Apresentação na página", "Hero, informações rápidas e vídeo promocional.", `
            <div class="form-grid form-grid--3">
              <div class="form-group"><label>Carga horária</label><input name="info_carga_horaria" value="${escapeHtml(i.carga_horaria || "")}" placeholder="Ex: 360 horas"></div>
              <div class="form-group"><label>Duração</label><input name="info_duracao" value="${escapeHtml(i.duracao || "")}" placeholder="Ex: 12 meses"></div>
              <div class="form-group"><label>Início previsto</label><input name="info_inicio_previsto" value="${escapeHtml(i.inicio_previsto || "")}" placeholder="Ex: 11 e 12 de Julho de 2026"></div>
              <div class="form-group"><label>Modalidade</label><input name="info_modalidade" value="${escapeHtml(i.modalidade || "")}" placeholder="Ex: 100% EAD — Aula ao vivo"></div>
              <div class="form-group"><label>Vagas</label><input name="info_vagas" value="${escapeHtml(i.vagas || "")}" placeholder="Opcional"></div>
              <div class="form-group"><label>Formato das aulas</label><input name="info_aulas" value="${escapeHtml(i.aulas || "")}" placeholder="Ex: Aula ao vivo"></div>
              <div class="form-group form-group--full"><label>Vídeo promocional (YouTube)</label><input name="info_video" value="${escapeHtml(i.video || "")}" placeholder="https://www.youtube.com/watch?v=..."></div>
              <div class="form-group form-group--full course-form__flags">
                <label class="form-check"><input type="checkbox" name="info_ultimas_vagas" ${i.ultimas_vagas ? "checked" : ""}> Destacar “Últimas vagas”</label>
                <label class="form-check"><input type="checkbox" name="info_confirmado" ${i.confirmado ? "checked" : ""}> Turma confirmada</label>
                <label class="form-check"><input type="checkbox" name="info_pre_inscricao" ${i.pre_inscricao ? "checked" : ""}> Modo pré-inscrição</label>
              </div>
            </div>
            <div class="form-divider"><span>Botão principal (hero)</span></div>
            <div class="form-grid">
              <div class="form-group"><label>Texto do botão</label><input name="hero_texto_botao" value="${escapeHtml(h.texto_botao || "Inscreva-se")}"></div>
              <div class="form-group form-group--full"><label>Link de inscrição</label><input name="hero_link_botao" value="${escapeHtml(h.link_botao || "")}" placeholder="https://inscricao.faculdadeide.edu.br/..."></div>
            </div>
          `)}

          ${coursePanel("cf-equipe", "Equipe e depoimentos", "Vincule coordenação, professores e depoimentos exibidos na página do curso.", `
            <div class="form-grid">
              ${checkboxGroup("coordenacao_ids", "coordination", c.coordenacao_ids || [], "Coordenação pedagógica")}
              ${checkboxGroup("professor_ids", "professors", c.professor_ids || [], "Professores")}
              ${checkboxGroup("depoimento_ids", "testimonials", getCourseDepoimentoIds(c), "Depoimentos")}
            </div>
          `)}

          ${coursePanel("cf-conteudo", "Sobre o curso", "Textos institucionais, objetivos e destaques.", `
            <div class="form-grid">
              <div class="form-group"><label>Tag da seção</label><input name="sobre_tag" value="${escapeHtml(s.tag || "Conheça o curso")}"></div>
              <div class="form-group form-group--full"><label>Parágrafo 1</label><textarea name="sobre_p1" rows="4" placeholder="Apresentação geral do curso">${escapeHtml(s.paragrafos?.[0] || "")}</textarea></div>
              <div class="form-group form-group--full"><label>Parágrafo 2</label><textarea name="sobre_p2" rows="4" placeholder="Diferenciais e metodologia">${escapeHtml(s.paragrafos?.[1] || "")}</textarea></div>
              <div class="form-group form-group--full"><label>Objetivos do curso</label><textarea name="objetivos" rows="4" placeholder="HTML permitido — lista o que o aluno vai aprender">${escapeHtml(c.objetivos || "")}</textarea></div>
              <div class="form-group form-group--full"><label>Destaques do curso</label><textarea name="destaques" rows="4" placeholder="HTML permitido — bullets de diferenciais">${escapeHtml(c.destaques || "")}</textarea></div>
              <div class="form-group form-group--full"><label>Matriz curricular (HTML)</label><textarea name="matriz_curricular" rows="5" placeholder="Tabela ou lista completa da matriz, se diferente dos módulos">${escapeHtml(c.matriz_curricular || "")}</textarea></div>
            </div>
          `)}

          ${coursePanel("cf-grade", "Grade curricular", "Módulos e disciplinas exibidos na página.", `
            <div class="repeater" id="modulos-repeater">
              ${mods.length ? mods.map((m) => moduleItemHtml(m)).join("") : moduleItemHtml({ titulo: "Módulo 1", itens: [] })}
            </div>
            <button type="button" class="btn btn--ghost btn--sm" id="add-modulo">${icon("plus", { size: 14 })} Adicionar módulo</button>
          `)}

          ${coursePanel("cf-publico", "Público-alvo", "Quatro blocos “Esse curso é para quem…” e imagem complementar.", `
            <div class="audience-grid">
              ${[0, 1, 2, 3].map((idx) => `
                <div class="audience-card">
                  <h3 class="audience-card__title">Perfil ${idx + 1}</h3>
                  ${renderImageUploadField({ name: `publico_imagem_${idx}`, value: audience[idx]?.imagem || "", label: "Ícone / imagem", folder: "courses/audience" })}
                  <div class="form-group"><label>Título (opcional)</label><input name="publico_titulo_${idx}" value="${escapeHtml(audience[idx]?.titulo || "")}"></div>
                  <div class="form-group form-group--full"><label>Texto</label><textarea name="publico_texto_${idx}" rows="3">${escapeHtml(audience[idx]?.texto || "")}</textarea></div>
                </div>`).join("")}
            </div>
            <div class="form-divider"><span>Seção complementar</span></div>
            ${renderImageUploadField({ name: "secao_complementar_imagem", value: c.secao_complementar?.imagem || "", label: "Banner complementar", folder: "courses", dimensions: "2560×360 px (desktop) · 1080×470 px (mobile)" })}
          `)}

          ${coursePanel("cf-investimento", "Investimento", "Valores, benefícios e botão da seção de preço.", `
            <div class="form-grid">
              <div class="form-group"><label>Label da oferta</label><input name="inv_oferta_label" value="${escapeHtml(inv.oferta_label || "")}" placeholder="Ex: Oferta de lançamento"></div>
              <div class="form-group"><label>Valor (parcelas)</label><input name="inv_oferta_valor" value="${escapeHtml(inv.oferta_valor || "")}" placeholder="Ex: 24x de R$ 277,08"></div>
              <div class="form-group"><label>Taxa de inscrição</label><input name="inv_taxa" value="${escapeHtml(inv.taxa_inscricao || "")}" placeholder="Ex: Taxa de Inscrição R$ 197,00"></div>
              <div class="form-group"><label>Texto do botão</label><input name="inv_texto_botao" value="${escapeHtml(inv.texto_botao || "Adquira")}"></div>
              <div class="form-group form-group--full"><label>Link do botão</label><input name="inv_link_botao" value="${escapeHtml(inv.link_botao || "")}"></div>
              <div class="form-group form-group--full"><label>Matrícula (HTML opcional)</label><textarea name="inv_matricula" rows="2">${escapeHtml(inv.matricula_html || "")}</textarea></div>
              <div class="form-group form-group--full"><label>Parcelas (HTML opcional)</label><textarea name="inv_parcelas" rows="2">${escapeHtml(inv.parcelas_html || "")}</textarea></div>
              <div class="form-group form-group--full"><label>Benefícios (um por linha)</label><textarea name="inv_beneficios" rows="6" placeholder="Formação em instituição referência...">${escapeHtml((inv.beneficios || []).join("\n"))}</textarea></div>
            </div>
          `)}

          ${coursePanel("cf-faq", "Perguntas frequentes", "Accordion exibido no final da página do curso.", `
            <div class="repeater" id="faq-repeater">
              ${faqs.length ? faqs.map((f) => faqItemHtml(f)).join("") : faqItemHtml({ pergunta: "", resposta: "" })}
            </div>
            <button type="button" class="btn btn--ghost btn--sm" id="add-faq">${icon("plus", { size: 14 })} Adicionar pergunta</button>
          `)}

          ${coursePanel("cf-seo", `SEO — ${seoResult.score}/100`, "Metadados para Google e redes sociais.", `
            <div class="seo-score">
              <div class="seo-score__circle">${seoResult.score}</div>
              <div>
                <strong>Otimização automática</strong>
                <p class="course-section__desc">Campos gerados com base no título, nível e status. Edite manualmente se necessário.</p>
                <button type="button" class="btn btn--ghost btn--sm" id="btn-auto-seo">${icon("sparkles", { size: 14 })} Regenerar SEO</button>
              </div>
            </div>
            <ul class="seo-checklist">
              ${seoResult.checks.map((ch) => `<li class="${ch.ok ? "is-ok" : ""}">${escapeHtml(ch.text)}</li>`).join("")}
            </ul>
            <div class="form-grid">
              <div class="form-group form-group--full"><label>Meta Title</label><input name="seo_title" value="${escapeHtml(seo.title || "")}" maxlength="60"><small>${SEO_LIMITS.titleMin}–${SEO_LIMITS.titleMax} caracteres · <span id="seo-title-len">${(seo.title || "").length}</span>/60</small></div>
              <div class="form-group form-group--full"><label>Meta Description</label><textarea name="seo_description" maxlength="160" rows="2">${escapeHtml(seo.description || "")}</textarea><small>${SEO_LIMITS.descriptionMin}–${SEO_LIMITS.descriptionMax} caracteres · <span id="seo-desc-len">${(seo.description || "").length}</span>/160</small></div>
              <div class="form-group"><label>Focus Keyword</label><input name="seo_focus" value="${escapeHtml(seo.focus_keyword || "")}"></div>
              <div class="form-group"><label>Keywords (vírgula)</label><input name="seo_keywords" value="${escapeHtml((seo.keywords || []).join(", "))}"></div>
              <div class="form-group form-group--full"><label>URL Canônica</label><input name="seo_canonical" value="${escapeHtml(seo.canonical || "")}"></div>
            </div>
            <div id="seo-preview">${renderSeoPreview(seo)}</div>
          `)}
        </div>
      </div>

      <div class="form-actions course-form__actions">
        <a href="#/courses" class="btn btn--ghost">${icon("x", { size: 16 })} Cancelar</a>
        <button type="submit" class="btn btn--primary">${icon("save", { size: 16 })} Salvar curso</button>
      </div>
    </form>`;
}

function moduleItemHtml(m) {
  return `<div class="repeater-item" data-modulo-item>
    <div class="repeater-item__head"><span>Módulo</span><button type="button" class="btn btn--ghost btn--sm btn--danger-outline" data-remove-modulo>${icon("trash", { size: 14 })} Remover</button></div>
    <div class="form-grid">
      <div class="form-group form-group--full"><label>Título</label><input name="modulo_titulo" value="${escapeHtml(m.titulo || "")}" placeholder="Ex: Módulo 1"></div>
      <div class="form-group form-group--full"><label>Disciplinas / itens (um por linha)</label><textarea name="modulo_itens" rows="4">${escapeHtml((m.itens || []).join("\n"))}</textarea></div>
    </div>
  </div>`;
}

function faqItemHtml(f) {
  return `<div class="repeater-item" data-faq-item>
    <div class="repeater-item__head"><span>Pergunta</span><button type="button" class="btn btn--ghost btn--sm btn--danger-outline" data-remove-faq>${icon("trash", { size: 14 })} Remover</button></div>
    <div class="form-grid">
      <div class="form-group form-group--full"><label>Pergunta</label><input name="faq_pergunta" value="${escapeHtml(f.pergunta || "")}"></div>
      <div class="form-group form-group--full"><label>Resposta</label><textarea name="faq_resposta" rows="3">${escapeHtml(f.resposta || "")}</textarea></div>
    </div>
  </div>`;
}

function bindCourseFormEvents(form) {
  $$("[data-image-upload]", form).forEach((wrap) => {
    bindImageUpload(wrap, { folder: wrap.dataset.folder || "courses" });
  });

  $$("[data-course-jump]", form).forEach((btn, index) => {
    if (index === 0) btn.classList.add("is-active");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.getElementById(btn.dataset.courseJump);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      $$(".course-form__nav-link", form).forEach((link) => link.classList.remove("is-active"));
      btn.classList.add("is-active");
    });
  });

  $("#add-modulo", form)?.addEventListener("click", () => {
    $("#modulos-repeater", form)?.insertAdjacentHTML("beforeend", moduleItemHtml({ titulo: "", itens: [] }));
  });

  $("#add-faq", form)?.addEventListener("click", () => {
    $("#faq-repeater", form)?.insertAdjacentHTML("beforeend", faqItemHtml({ pergunta: "", resposta: "" }));
  });

  form.addEventListener("click", (e) => {
    if (e.target.closest("[data-remove-modulo]")) {
      e.target.closest("[data-modulo-item]")?.remove();
      return;
    }
    if (e.target.closest("[data-remove-faq]")) {
      e.target.closest("[data-faq-item]")?.remove();
    }
  });

  $("#titulo", form)?.addEventListener("input", (e) => {
    const slugEl = $("#slug", form);
    if (!slugEl?.value || slugEl.dataset.auto !== "false") {
      const s = slugify(e.target.value);
      slugEl.value = s;
      const preview = $("#slug-preview");
      if (preview) preview.textContent = s || "slug-do-curso";
    }
  });

  $("#slug", form)?.addEventListener("input", (e) => {
    e.target.dataset.auto = "false";
    const preview = $("#slug-preview");
    if (preview) preview.textContent = e.target.value || "slug-do-curso";
  });

  $("#btn-auto-seo", form)?.addEventListener("click", () => {
    const partial = collectCourseForm(form);
    const generated = generateCourseSeo(
      partial,
      lookup("formation-levels", partial.nivel_formacao_id),
      lookup("areas", partial.area_id),
      lookup("statuses", partial.status_curso_id),
    );
    form.seo_title.value = generated.title;
    form.seo_description.value = generated.description;
    form.seo_focus.value = generated.focus_keyword;
    form.seo_keywords.value = generated.keywords.join(", ");
    form.seo_canonical.value = generated.canonical;
    const preview = $("#seo-preview");
    if (preview) preview.innerHTML = renderSeoPreview(generated);
    toast("SEO regenerado!");
  });
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
    depoimento_ids: [],
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

function renderImageUploadField({ name = "foto", value = "", label = "Foto", folder = "uploads", dimensions = "" }) {
  const preview = value
    ? `<img src="${mediaUrl(value)}" alt="">`
    : `<div class="image-upload__placeholder">Nenhuma imagem</div>`;
  const aspect = dimensions === "350×350 px" ? "square" : dimensions ? "portrait" : "";

  return `
    <div class="form-group form-group--full image-upload${aspect ? ` image-upload--${aspect}` : ""}" data-image-upload data-folder="${folder}">
      <label>${label}</label>
      <input type="hidden" name="${name}" value="${escapeHtml(value)}">
      <div class="image-upload__preview">${preview}</div>
      <label class="image-upload__btn btn btn--ghost btn--sm">
        ${icon("image", { size: 16 })} Escolher imagem
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="image-upload__input" hidden>
      </label>
      <small>JPG, PNG ou WebP. Máximo de 2 MB.${dimensions ? ` Tamanho recomendado: <strong>${dimensions}</strong>.` : ""}</small>
      <p class="image-upload__status" hidden></p>
    </div>`;
}

function renderEntityList(collection, title, formRenderer) {
  setPage(title, `Cadastro de ${title.toLowerCase()}`);
  const items = getAll(collection);
  const isProfessors = collection === "professors";

  const tableClass = isProfessors ? "data-table data-table--entities" : "data-table data-table--compact";

  return `
    <div class="panel">
      <div class="panel__head"><h2>${title}</h2><button type="button" class="btn btn--primary btn--sm" id="btn-new-entity">${icon("plus", { size: 14 })} Adicionar</button></div>
      <div class="panel__body panel__body--flush table-wrap">
        <table class="${tableClass}"><thead><tr>
          <th class="col-name">Nome</th>
          ${isProfessors ? '<th class="col-course">Curso</th>' : ""}
          <th class="col-status">Status</th>
          <th class="col-actions">Ações</th>
        </tr></thead>
        <tbody>${items.map((item) => `<tr>
          <td class="col-name">
            <span class="cell-name__title">${escapeHtml(item.nome)}</span>
            ${isProfessors && item.descricao ? `<span class="cell-name__meta">${escapeHtml(item.descricao.slice(0, 80))}${item.descricao.length > 80 ? "…" : ""}</span>` : ""}
          </td>
          ${isProfessors ? `<td class="col-course"><span class="cell-course">${escapeHtml(item.nome_curso || "—")}</span></td>` : ""}
          <td class="col-status">${item.ativo !== false ? '<span class="badge badge--live">Ativo</span>' : '<span class="badge badge--draft">Inativo</span>'}</td>
          <td class="col-actions">
            <div class="table-actions">
              <button type="button" class="btn btn--ghost btn--sm" data-edit-entity="${item.id}">${icon("pencil", { size: 14 })} Editar</button>
              <button type="button" class="btn btn--ghost btn--sm btn--danger-outline" data-delete-entity="${item.id}">${icon("trash", { size: 14 })} Excluir</button>
            </div>
          </td>
        </tr>`).join("") || `<tr><td colspan="${isProfessors ? 4 : 3}" class="empty">Nenhum registro.</td></tr>`}
        </tbody></table>
      </div>
    </div>
    <div id="entity-modal" hidden></div>`;
}

function renderProfessorForm(item) {
  const p = item || {
    id: uid("prof"),
    nome: "",
    foto: "",
    titulo: "",
    estado: "",
    nome_curso: "",
    descricao: "",
    ativo: true,
  };
  const descLen = (p.descricao || "").length;

  return entityFormShell("Professores", p, `
    <div class="form-grid">
      <div class="form-group form-group--full"><label>Nome *</label><input name="nome" value="${escapeHtml(p.nome)}" required></div>
      <div class="form-group"><label>Título / Cargo</label><input name="titulo" value="${escapeHtml(p.titulo || "")}"></div>
      <div class="form-group"><label>Estado (UF)</label><input name="estado" value="${escapeHtml(p.estado || "")}"></div>
      <div class="form-group form-group--full">
        <label for="nome_curso">Nome do curso</label>
        <input id="nome_curso" name="nome_curso" value="${escapeHtml(p.nome_curso || "")}" placeholder="Ex: Aleitamento Materno e Banco de Leite Humano">
      </div>
      ${renderImageUploadField({ value: p.foto || "", label: "Foto", folder: "professors", dimensions: "300×469 px" })}
      <div class="form-group form-group--full">
        <label for="descricao">Breve descrição</label>
        <textarea id="descricao" name="descricao" rows="3" maxlength="120" data-char-counter="descricao-count">${escapeHtml(p.descricao || "")}</textarea>
        <small><span id="descricao-count">${descLen}</span>/120 caracteres</small>
      </div>
      <div class="form-group"><label class="form-check"><input type="checkbox" name="ativo" ${p.ativo !== false ? "checked" : ""}> Ativo</label></div>
    </div>`);
}

function renderCoordForm(item) {
  const p = item || { id: uid("coord"), nome: "", foto: "", cargo: "", mini_curriculo: [], ativo: true };
  return entityFormShell("Coordenação", p, `
    <div class="form-grid">
      <div class="form-group form-group--full"><label>Nome *</label><input name="nome" value="${escapeHtml(p.nome)}" required></div>
      <div class="form-group form-group--full"><label>Cargo / Resumo</label><input name="cargo" value="${escapeHtml(p.cargo || "")}"></div>
      ${renderImageUploadField({ value: p.foto || "", label: "Foto", folder: "coordination", dimensions: "350×350 px" })}
      <div class="form-group form-group--full"><label>Mini-currículo (um item por linha)</label><textarea name="mini_curriculo" rows="5">${escapeHtml((p.mini_curriculo || []).join("\n"))}</textarea></div>
      <div class="form-group"><label class="form-check"><input type="checkbox" name="ativo" ${p.ativo !== false ? "checked" : ""}> Ativo</label></div>
    </div>`);
}

function renderTestimonialsList() {
  setPage("Depoimentos", "Texto, vídeo e imagem em um só lugar");
  const items = getAll("testimonials");

  return `
    <div class="panel">
      <div class="panel__head">
        <h2>${icon("message-square-quote", { size: 18 })} Depoimentos</h2>
        <button type="button" class="btn btn--primary btn--sm" id="btn-new-entity">${icon("plus", { size: 14 })} Adicionar</button>
      </div>
      <div class="panel__body panel__body--flush table-wrap">
        <table class="data-table data-table--entities">
          <thead><tr>
            <th class="col-name">Nome</th>
            <th class="col-course">Tipo</th>
            <th class="col-status">Status</th>
            <th class="col-actions">Ações</th>
          </tr></thead>
          <tbody>${items.map((item) => `<tr>
            <td class="col-name">
              <span class="cell-name__title">${escapeHtml(item.nome)}</span>
              <span class="cell-name__meta">${escapeHtml(testimonialSummary(item))}</span>
            </td>
            <td class="col-course">${testimonialTypeBadge(item.tipo || "texto")}</td>
            <td class="col-status">${item.ativo !== false ? '<span class="badge badge--live">Ativo</span>' : '<span class="badge badge--draft">Inativo</span>'}</td>
            <td class="col-actions">
              <div class="table-actions">
                <button type="button" class="btn btn--ghost btn--sm" data-edit-entity="${item.id}">${icon("pencil", { size: 14 })} Editar</button>
                <button type="button" class="btn btn--ghost btn--sm btn--danger-outline" data-delete-entity="${item.id}">${icon("trash", { size: 14 })} Excluir</button>
              </div>
            </td>
          </tr>`).join("") || `<tr><td colspan="4" class="empty">Nenhum depoimento cadastrado.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
    <div id="entity-modal" hidden></div>`;
}

function renderTestimonialForm(item) {
  const p = item || {
    id: uid("dep"),
    nome: "",
    tipo: "texto",
    profissao: "",
    texto: "",
    video_url: "",
    thumbnail: "",
    imagem: "",
    legenda: "",
    ativo: true,
  };
  const tipo = p.tipo || "texto";

  return entityFormShell("Depoimento", p, `
    <div class="form-grid">
      <div class="form-group form-group--full"><label>Nome *</label><input name="nome" value="${escapeHtml(p.nome)}" required></div>
      <div class="form-group">
        <label for="testimonial-tipo">Tipo *</label>
        <select id="testimonial-tipo" name="tipo" required>
          <option value="texto" ${tipo === "texto" ? "selected" : ""}>Texto</option>
          <option value="video" ${tipo === "video" ? "selected" : ""}>Vídeo</option>
          <option value="imagem" ${tipo === "imagem" ? "selected" : ""}>Imagem</option>
        </select>
      </div>
      <div class="form-group"><label class="form-check"><input type="checkbox" name="ativo" ${p.ativo !== false ? "checked" : ""}> Ativo</label></div>

      <div class="testimonial-fields testimonial-fields--texto" data-tipo-panel="texto" ${tipo !== "texto" ? "hidden" : ""}>
        <div class="form-group"><label>Profissão / Curso</label><input name="profissao" value="${escapeHtml(p.profissao || "")}"></div>
        <div class="form-group form-group--full"><label>Depoimento</label><textarea name="texto" rows="4">${escapeHtml(p.texto || "")}</textarea></div>
      </div>

      <div class="testimonial-fields testimonial-fields--video" data-tipo-panel="video" ${tipo !== "video" ? "hidden" : ""}>
        <div class="form-group form-group--full"><label>URL do vídeo (YouTube)</label><input name="video_url" value="${escapeHtml(p.video_url || "")}" placeholder="https://www.youtube.com/watch?v=..."></div>
        <div class="form-group form-group--full"><label>Thumbnail (URL)</label><input name="thumbnail" value="${escapeHtml(p.thumbnail || "")}"></div>
      </div>

      <div class="testimonial-fields testimonial-fields--imagem" data-tipo-panel="imagem" ${tipo !== "imagem" ? "hidden" : ""}>
        ${renderImageUploadField({ name: "imagem", value: p.imagem || "", label: "Imagem", folder: "testimonials" })}
        <div class="form-group form-group--full"><label>Legenda</label><input name="legenda" value="${escapeHtml(p.legenda || "")}"></div>
      </div>
    </div>`);
}

function bindTestimonialTipoFields(form) {
  const select = form?.querySelector("#testimonial-tipo");
  if (!select) return;

  const syncPanels = () => {
    const tipo = select.value;
    form.querySelectorAll("[data-tipo-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.tipoPanel !== tipo;
    });
  };

  select.addEventListener("change", syncPanels);
  syncPanels();
}

function entityFormShell(title, item, fieldsHtml) {
  return `
    <div class="panel" id="entity-form-panel">
      <div class="panel__head"><h2>${item.nome ? `Editar: ${escapeHtml(item.nome)}` : `Novo — ${title}`}</h2></div>
      <div class="panel__body">
        <form id="entity-form" data-entity-id="${item.id}">
          ${fieldsHtml}
          <div class="form-actions">
            <button type="button" class="btn btn--ghost" id="cancel-entity">${icon("x", { size: 16 })} Cancelar</button>
            <button type="submit" class="btn btn--primary">${icon("save", { size: 16 })} Salvar</button>
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
            <button type="button" class="btn btn--ghost btn--sm" data-edit-tax="${item.id}">${icon("pencil", { size: 14 })} Editar</button>
            <button type="button" class="btn btn--ghost btn--sm btn--danger-outline" data-delete-tax="${item.id}">${icon("trash", { size: 14 })} Excluir</button>
          </td>` : `<td>—</td>`}
        </tr>`).join("")}</tbody></table>
        ${allowAdd ? `
          <form id="tax-form" style="margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border)">
            <div class="form-grid">
              <div class="form-group"><label>Nome</label><input name="nome" required placeholder="Ex: Graduação"></div>
              <div class="form-group"><label>Slug</label><input name="slug" placeholder="auto"></div>
            </div>
            <div class="form-actions" style="border:none;margin:0;padding-top:.75rem">
              <button type="submit" class="btn btn--primary btn--sm">${icon("plus", { size: 14 })} Adicionar nível</button>
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
  $$("[data-modulo-item]", form).forEach((el) => {
    modulos.push({
      titulo: el.querySelector('[name="modulo_titulo"]')?.value.trim() || "",
      itens: (el.querySelector('[name="modulo_itens"]')?.value || "").split("\n").map((s) => s.trim()).filter(Boolean),
    });
  });

  const faq = [];
  $$("[data-faq-item]", form).forEach((el) => {
    const pergunta = el.querySelector('[name="faq_pergunta"]')?.value.trim();
    const resposta = el.querySelector('[name="faq_resposta"]')?.value.trim();
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
    depoimento_ids: getCheckedIds(form, "depoimento_ids"),
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
      ultimas_vagas: form.info_ultimas_vagas?.checked || false,
      confirmado: form.info_confirmado?.checked || false,
      pre_inscricao: form.info_pre_inscricao?.checked || false,
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
    secao_complementar: {
      imagem: form.secao_complementar_imagem?.value.trim() || "",
      nota_dimensoes: "2560x360px para Desktop e 1080x470px para Mobile",
    },
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
  delete course.depoimento_texto_ids;
  delete course.depoimento_video_ids;
  delete course.depoimento_imagem_ids;
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
    bindCourseFormEvents(courseForm);

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
  bindAccountEvents();
}

function bindAccountEvents() {
  if (currentRoute !== "account") return;

  const emailForm = $("#account-email-form");
  const emailError = $("#account-email-error");

  emailForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    emailError.hidden = true;
    try {
      await updateAccount({ email: emailForm.email.value.trim() });
      toast("E-mail salvo com sucesso!");
    } catch (err) {
      emailError.textContent = err.message;
      emailError.hidden = false;
    }
  });

  const passwordForm = $("#account-password-form");
  const passwordError = $("#account-password-error");

  passwordForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    passwordError.hidden = true;

    const currentPassword = passwordForm.currentPassword.value;
    const newPassword = passwordForm.newPassword.value;
    const confirmPassword = passwordForm.confirmPassword.value;

    if (newPassword !== confirmPassword) {
      passwordError.textContent = "As senhas não coincidem.";
      passwordError.hidden = false;
      return;
    }

    try {
      await updateAccount({ currentPassword, newPassword });
      passwordForm.reset();
      toast("Senha atualizada com sucesso!");
    } catch (err) {
      passwordError.textContent = err.message;
      passwordError.hidden = false;
    }
  });

  $("#btn-logout-account")?.addEventListener("click", handleLogout);
}

async function handleLogout() {
  await logout();
  showLogin();
  $("#login-form")?.reset();
  location.hash = "";
}

function bindEntityEvents() {
  const collection = currentRoute;
  if (!["professors", "coordination", "testimonials"].includes(collection)) return;

  const formRenderers = {
    professors: renderProfessorForm,
    coordination: renderCoordForm,
    testimonials: renderTestimonialForm,
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

  const form = $("#entity-form");
  $$("[data-image-upload]", form).forEach((wrap) => {
    bindImageUpload(wrap, { folder: wrap.dataset.folder || "uploads" });
  });

  form?.querySelectorAll("[data-char-counter]").forEach((field) => {
    const counter = document.getElementById(field.dataset.charCounter);
    const update = () => {
      if (counter) counter.textContent = String(field.value.length);
    };
    field.addEventListener("input", update);
    update();
  });

  if (collection === "testimonials") {
    bindTestimonialTipoFields(form);
  }

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = form.dataset.entityId;
    const existing = getById(collection, id);
    const data = { ...(existing || {}), id };

    const fd = new FormData(form);
    for (const [key, val] of fd.entries()) {
      if (key === "ativo") data.ativo = true;
      else if (key === "mini_curriculo") data[key] = val.split("\n").map((s) => s.trim()).filter(Boolean);
      else if (key === "descricao") data[key] = String(val).slice(0, 120);
      else data[key] = val;
    }
    if (!fd.has("ativo")) data.ativo = false;
    if (!data.nome?.trim()) return toast("Nome obrigatório", "error");

    if (collection === "testimonials") {
      const tipo = data.tipo || "texto";
      if (tipo === "texto" && !data.texto?.trim()) {
        return toast("Informe o texto do depoimento", "error");
      }
      if (tipo === "video" && !data.video_url?.trim()) {
        return toast("Informe a URL do vídeo", "error");
      }
      if (tipo === "imagem" && !data.imagem?.trim()) {
        return toast("Envie ou informe a imagem do depoimento", "error");
      }
    }

    const uploading = form.querySelector(".image-upload__status:not([hidden])");
    if (uploading?.textContent?.includes("Enviando")) {
      return toast("Aguarde o upload da imagem terminar.", "error");
    }

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
  document.body.classList.add("login-mode");
  document.body.classList.remove("admin-mode");
  $("#login-screen").hidden = false;
  $("#app").hidden = true;
}

function showApp() {
  document.body.classList.remove("login-mode");
  document.body.classList.add("admin-mode");
  $("#login-screen").hidden = true;
  $("#app").hidden = false;
}

async function boot() {
  if (location.search) {
    history.replaceState(null, "", location.pathname);
  }

  const loginForm = $("#login-form");
  const loginError = $("#login-error");

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    const submitBtn = loginForm.querySelector(".login-submit");
    submitBtn?.classList.add("is-loading");
    submitBtn?.setAttribute("disabled", "disabled");

    const fd = new FormData(loginForm);
    try {
      await login(fd.get("username"), fd.get("password"));
      await enterAdminFromLogin();
      await startApp();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.hidden = false;
    } finally {
      submitBtn?.classList.remove("is-loading");
      submitBtn?.removeAttribute("disabled");
    }
  });

  $("#nav")?.addEventListener("click", async (e) => {
    const logoutBtn = e.target.closest("[data-action='logout']");
    if (!logoutBtn) return;
    e.preventDefault();
    await handleLogout();
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
    window.addEventListener("hashchange", navigate);
  }

  loadFromLocalStorage();
  await initStore();
  navigate();
}

boot();
