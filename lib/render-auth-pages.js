/**
 * Páginas de autenticação de alunos (Supabase Auth).
 */
import {
  renderFooter,
  renderGtmBody,
  renderGtmHead,
  renderHeader,
  renderSiteLayoutScripts,
  renderSiteMotionStyles,
} from "./site-layout.js";
import { renderSupabaseConfigScript } from "./supabase/public-config.js";

const TOTVS_PORTAL =
  "https://institutode131845.rm.cloudtotvs.com.br/FrameHTML/web/app/edu/PortalEducacional/login/";

function renderAuthCrossLinks({ showCms = true } = {}) {
  const links = [
    `<a href="/entrar">Área do aluno</a>`,
    `<a href="/cadastro">Criar conta</a>`,
  ];
  if (showCms) {
    links.push(`<a href="/admin">Painel CMS</a>`);
  }
  return `<p class="auth-card__hub">${links.join(' <span aria-hidden="true">·</span> ')}</p>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderAuthShell({ title, description, body, page = "login" }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${renderGtmHead()}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="noindex, follow">
  <link rel="icon" href="/assets/img/FAV-ICON-3.svg" sizes="any">
  <link rel="stylesheet" href="/assets/css/tokens.css">
  <link rel="stylesheet" href="/assets/css/base.css">
  <link rel="stylesheet" href="/assets/css/components.css">
  <link rel="stylesheet" href="/assets/css/auth.css">
  ${renderSiteMotionStyles({ base: "/" })}
  ${renderSupabaseConfigScript()}
</head>
<body class="site-layout auth-layout" data-auth-page="${escapeHtml(page)}">
  ${renderGtmBody()}
  ${renderHeader({ base: "/", ctaHref: "/#inscricao" })}
  <main class="auth-main">
    <div class="container auth-main__inner">
      ${body}
    </div>
  </main>
  ${renderFooter({ base: "/" })}
  ${renderSiteLayoutScripts({ base: "/" })}
  <script type="module" src="/assets/js/user-auth.js"></script>
</body>
</html>`;
}

export function renderLoginPage() {
  const body = `<section class="auth-card" aria-labelledby="auth-login-title">
    <div class="auth-card__head">
      <h1 id="auth-login-title" class="auth-card__title">Entrar na sua conta</h1>
      <p class="auth-card__lead">Acesse sua área de aluno da Faculdade IDE EAD.</p>
    </div>
    <form class="auth-form" id="auth-login-form" novalidate>
      <div class="field">
        <label for="login-email">E-mail</label>
        <input id="login-email" name="email" type="email" autocomplete="email" required>
      </div>
      <div class="field">
        <label for="login-password">Senha</label>
        <input id="login-password" name="password" type="password" autocomplete="current-password" required minlength="6">
      </div>
      <p class="auth-form__msg" id="auth-login-msg" role="status" aria-live="polite"></p>
      <button class="btn btn--primary auth-form__submit" type="submit">Entrar</button>
    </form>
    <p class="auth-card__foot">
      <a href="/recuperar-senha">Esqueci minha senha</a>
      <span aria-hidden="true">·</span>
      <a href="/cadastro">Criar conta</a>
    </p>
    <p class="auth-card__portal">
      Já matriculado no portal acadêmico?
      <a href="${TOTVS_PORTAL}" target="_blank" rel="noopener noreferrer">Acessar portal TOTVS</a>
    </p>
    ${renderAuthCrossLinks()}
  </section>`;

  return renderAuthShell({
    title: "Entrar — Faculdade IDE EAD",
    description: "Faça login na sua conta de aluno da Faculdade IDE EAD.",
    body,
    page: "login",
  });
}

export function renderRegisterPage() {
  const body = `<section class="auth-card" aria-labelledby="auth-register-title">
    <div class="auth-card__head">
      <h1 id="auth-register-title" class="auth-card__title">Criar conta</h1>
      <p class="auth-card__lead">Cadastre-se para acompanhar sua jornada na Faculdade IDE EAD.</p>
    </div>
    <form class="auth-form" id="auth-register-form" novalidate>
      <div class="field">
        <label for="register-name">Nome completo</label>
        <input id="register-name" name="fullName" type="text" autocomplete="name" required>
      </div>
      <div class="field">
        <label for="register-email">E-mail</label>
        <input id="register-email" name="email" type="email" autocomplete="email" required>
      </div>
      <div class="field">
        <label for="register-phone">Telefone (opcional)</label>
        <input id="register-phone" name="phone" type="tel" autocomplete="tel">
      </div>
      <div class="field">
        <label for="register-password">Senha</label>
        <input id="register-password" name="password" type="password" autocomplete="new-password" required minlength="8">
      </div>
      <div class="field">
        <label for="register-password-confirm">Confirmar senha</label>
        <input id="register-password-confirm" name="passwordConfirm" type="password" autocomplete="new-password" required minlength="8">
      </div>
      <p class="auth-form__msg" id="auth-register-msg" role="status" aria-live="polite"></p>
      <button class="btn btn--primary auth-form__submit" type="submit">Criar conta</button>
    </form>
    <p class="auth-card__foot">
      Já tem conta? <a href="/entrar">Entrar</a>
    </p>
    ${renderAuthCrossLinks()}
  </section>`;

  return renderAuthShell({
    title: "Criar conta — Faculdade IDE EAD",
    description: "Cadastre-se na Faculdade IDE EAD.",
    body,
    page: "register",
  });
}

export function renderResetPasswordPage() {
  const body = `<section class="auth-card" aria-labelledby="auth-reset-title">
    <div class="auth-card__head">
      <h1 id="auth-reset-title" class="auth-card__title">Recuperar senha</h1>
      <p class="auth-card__lead">Enviaremos um link de redefinição para o seu e-mail.</p>
    </div>
    <form class="auth-form" id="auth-reset-form" novalidate>
      <div class="field">
        <label for="reset-email">E-mail</label>
        <input id="reset-email" name="email" type="email" autocomplete="email" required>
      </div>
      <p class="auth-form__msg" id="auth-reset-msg" role="status" aria-live="polite"></p>
      <button class="btn btn--primary auth-form__submit" type="submit">Enviar link</button>
    </form>
    <p class="auth-card__foot">
      <a href="/entrar">Voltar ao login</a>
    </p>
    ${renderAuthCrossLinks()}
  </section>`;

  return renderAuthShell({
    title: "Recuperar senha — Faculdade IDE EAD",
    description: "Recupere o acesso à sua conta de aluno.",
    body,
    page: "reset",
  });
}

export function renderAccountPage() {
  const body = `<section class="auth-card auth-card--wide" aria-labelledby="auth-account-title" hidden id="auth-account-panel">
    <div class="auth-card__head">
      <h1 id="auth-account-title" class="auth-card__title">Minha conta</h1>
      <p class="auth-card__lead">Gerencie seus dados de acesso à Faculdade IDE EAD.</p>
    </div>
    <dl class="auth-account__meta">
      <div>
        <dt>Nome</dt>
        <dd id="account-full-name">—</dd>
      </div>
      <div>
        <dt>E-mail</dt>
        <dd id="account-email">—</dd>
      </div>
      <div>
        <dt>Telefone</dt>
        <dd id="account-phone-readonly">—</dd>
      </div>
      <div>
        <dt>Nível de acesso</dt>
        <dd id="account-access-level">—</dd>
      </div>
    </dl>
    <p class="auth-account__notice" id="account-readonly-notice" hidden>
      Seu acesso é somente leitura. Para alterar dados, fale com o administrador.
    </p>
    <p class="auth-account__notice" id="account-cms-notice" hidden>
      Como super admin, gerencie usuários e níveis de acesso em
      <a href="/admin#/account/users">Configurações de conta → Usuários cadastrados</a> no painel CMS.
    </p>
    <form class="auth-form auth-form--split" id="auth-profile-form" hidden novalidate>
      <div class="field">
        <label for="profile-phone">Telefone</label>
        <input id="profile-phone" name="phone" type="tel" autocomplete="tel">
      </div>
      <p class="auth-form__msg" id="auth-profile-msg" role="status" aria-live="polite"></p>
      <button class="btn btn--outline auth-form__submit" type="submit">Salvar telefone</button>
    </form>
    <div class="auth-account__actions">
      <a class="btn btn--primary" href="${TOTVS_PORTAL}" target="_blank" rel="noopener noreferrer">Portal acadêmico TOTVS</a>
      <button class="btn btn--outline" type="button" id="auth-logout-btn">Sair</button>
    </div>
    ${renderAuthCrossLinks({ showCms: true })}
  </section>
  <section class="auth-card auth-card--loading" id="auth-account-loading" aria-live="polite">
    <p class="auth-card__lead">Carregando sua conta…</p>
  </section>`;

  return renderAuthShell({
    title: "Minha conta — Faculdade IDE EAD",
    description: "Área do aluno Faculdade IDE EAD.",
    body,
    page: "account",
  });
}

export function renderAdminUsersPage() {
  const body = `<section class="auth-card auth-card--loading" aria-live="polite">
    <p class="auth-card__lead">Redirecionando para o painel CMS…</p>
  </section>
  <script>window.location.replace("/admin#/account/users");</script>`;

  return renderAuthShell({
    title: "Gerenciar usuários — Faculdade IDE EAD",
    description: "Redirecionamento para o painel CMS.",
    body,
    page: "admin-users",
  });
}

export function renderAuthCallbackPage() {
  const body = `<section class="auth-card auth-card--loading" aria-live="polite">
    <p class="auth-card__lead">Confirmando seu acesso…</p>
  </section>`;

  return renderAuthShell({
    title: "Confirmando acesso — Faculdade IDE EAD",
    description: "Processando confirmação de autenticação.",
    body,
    page: "callback",
  });
}

export function renderUpdatePasswordPage() {
  const body = `<section class="auth-card" aria-labelledby="auth-new-password-title">
    <div class="auth-card__head">
      <h1 id="auth-new-password-title" class="auth-card__title">Nova senha</h1>
      <p class="auth-card__lead">Defina uma nova senha para sua conta.</p>
    </div>
    <form class="auth-form" id="auth-new-password-form" novalidate>
      <div class="field">
        <label for="new-password">Nova senha</label>
        <input id="new-password" name="password" type="password" autocomplete="new-password" required minlength="8">
      </div>
      <div class="field">
        <label for="new-password-confirm">Confirmar nova senha</label>
        <input id="new-password-confirm" name="passwordConfirm" type="password" autocomplete="new-password" required minlength="8">
      </div>
      <p class="auth-form__msg" id="auth-new-password-msg" role="status" aria-live="polite"></p>
      <button class="btn btn--primary auth-form__submit" type="submit">Salvar nova senha</button>
    </form>
  </section>`;

  return renderAuthShell({
    title: "Nova senha — Faculdade IDE EAD",
    description: "Defina uma nova senha para sua conta.",
    body,
    page: "new-password",
  });
}

export function renderAuthUnavailablePage() {
  return renderAuthShell({
    title: "Login indisponível — Faculdade IDE EAD",
    description: "Autenticação temporariamente indisponível.",
    body: `<section class="auth-card">
      <h1 class="auth-card__title">Login indisponível</h1>
      <p class="auth-card__lead">A autenticação ainda não está configurada neste ambiente. Tente novamente em instantes ou acesse o <a href="${TOTVS_PORTAL}" target="_blank" rel="noopener noreferrer">portal acadêmico</a>.</p>
    </section>`,
    page: "unavailable",
  });
}
