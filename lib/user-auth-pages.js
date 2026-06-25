import {
  renderAccountPage,
  renderAdminUsersPage,
  renderAuthCallbackPage,
  renderAuthUnavailablePage,
  renderLoginPage,
  renderRegisterPage,
  renderResetPasswordPage,
  renderUpdatePasswordPage,
} from "./render-auth-pages.js";
import { getPublicSupabaseConfig } from "./supabase/public-config.js";

const PAGES = {
  login: renderLoginPage,
  register: renderRegisterPage,
  reset: renderResetPasswordPage,
  account: renderAccountPage,
  "admin-users": renderAdminUsersPage,
  callback: renderAuthCallbackPage,
  "new-password": renderUpdatePasswordPage,
};

export async function handleAuthPageRequest(req, res, pageKey) {
  if (req.method !== "GET") {
    res.status(405).setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ error: "Método não permitido" }));
  }

  const render = PAGES[pageKey];
  if (!render) {
    res.status(404).setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ error: "Página não encontrada" }));
  }

  const html = getPublicSupabaseConfig() ? render() : renderAuthUnavailablePage();

  res.status(200).setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(html);
}

export async function handlePublicConfigRequest(req, res) {
  if (req.method !== "GET") {
    res.status(405).setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ error: "Método não permitido" }));
  }

  const config = getPublicSupabaseConfig();
  if (!config) {
    res.status(503).setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ error: "Supabase não configurado" }));
  }

  res.status(200).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.end(JSON.stringify(config));
}
