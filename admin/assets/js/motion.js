const REDUCED = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function animateTopbar() {
  const topbar = document.querySelector(".admin__topbar");
  if (!topbar || REDUCED()) return;

  topbar.classList.remove("topbar-enter");
  void topbar.offsetWidth;
  topbar.classList.add("topbar-enter");
}

export function runContentAnimations(container) {
  if (!container || REDUCED()) return;

  container.classList.add("page-stagger");
  const items = [
    ...container.querySelectorAll(
      ".stats > .stat-card, .panel, .account-grid > .panel, .course-section, .course-form__section, .form-section, .template-preview-shell, #template-form-panel, #entity-form-panel, .sidebar__nav a"
    ),
    ...container.querySelectorAll(".data-table tbody tr"),
  ].slice(0, 16);

  items.forEach((el, index) => {
    el.style.setProperty("--stagger-index", String(index));
  });

  window.setTimeout(() => {
    container.classList.remove("page-stagger");
    items.forEach((el) => el.style.removeProperty("--stagger-index"));
  }, 900);
}

export async function transitionPage(contentEl, render) {
  if (!contentEl || REDUCED()) {
    await render();
    runContentAnimations(contentEl);
    animateTopbar();
    return;
  }

  const hasContent = Boolean(contentEl.innerHTML.trim());

  if (hasContent) {
    contentEl.classList.add("page-leave");
    await wait(180);
  }

  await render();
  contentEl.classList.remove("page-leave");
  contentEl.classList.add("page-enter");
  runContentAnimations(contentEl);
  animateTopbar();

  await wait(360);
  contentEl.classList.remove("page-enter");
}

export async function exitLoginScreen(loginScreen) {
  if (!loginScreen || REDUCED()) {
    if (loginScreen) loginScreen.hidden = true;
    return;
  }

  loginScreen.classList.add("login-screen--exit");
  await wait(320);
  loginScreen.hidden = true;
  loginScreen.classList.remove("login-screen--exit");
}

export async function playAdminEntrance() {
  const overlay = document.getElementById("admin-entrance");
  const app = document.getElementById("app");

  if (!overlay) return;

  if (REDUCED()) {
    overlay.hidden = true;
    app?.classList.remove("admin-app--hidden");
    return;
  }

  overlay.hidden = false;
  overlay.classList.remove("is-leaving");
  overlay.classList.add("is-active");
  app?.classList.add("admin-app--hidden");

  await wait(1100);

  overlay.classList.add("is-leaving");
  app?.classList.remove("admin-app--hidden");
  app?.classList.add("admin-app--revealing");

  await wait(520);

  overlay.hidden = true;
  overlay.classList.remove("is-active", "is-leaving");
  app?.classList.remove("admin-app--revealing");
}

export async function enterAdminFromLogin() {
  const loginScreen = document.getElementById("login-screen");
  const app = document.getElementById("app");

  document.body.classList.remove("login-mode");
  document.body.classList.add("admin-mode");

  await exitLoginScreen(loginScreen);

  if (app) app.hidden = false;

  await playAdminEntrance();
}

let pendingSaves = 0;

export function setSaving(active, message = "Salvando...") {
  const bar = document.getElementById("save-bar");
  const status = document.getElementById("save-status");
  const main = document.querySelector(".admin__main");

  if (active) {
    pendingSaves += 1;
    document.body.classList.add("is-saving");
    main?.classList.add("is-saving");
    if (bar) {
      bar.hidden = false;
      bar.classList.add("is-active");
    }
    const text = status?.querySelector(".save-status__text");
    if (text) text.textContent = message;
    if (status) status.hidden = false;
    return;
  }

  pendingSaves = Math.max(0, pendingSaves - 1);
  if (pendingSaves > 0) return;

  document.body.classList.remove("is-saving");
  main?.classList.remove("is-saving");
  bar?.classList.remove("is-active");
  if (bar) bar.hidden = true;
  if (status) status.hidden = true;
}

export function setSubmitLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle("is-loading", loading);
  btn.disabled = loading;
}

export async function withSaveFeedback(task, { message = "Salvando...", submitBtn = null } = {}) {
  setSaving(true, message);
  setSubmitLoading(submitBtn, true);
  try {
    return await task();
  } finally {
    setSubmitLoading(submitBtn, false);
    setSaving(false);
  }
}
