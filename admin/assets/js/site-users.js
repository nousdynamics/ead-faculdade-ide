import { authHeaders } from "./auth.js";

export async function fetchSiteUsers() {
  const res = await fetch("/api/auth/site-users", { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Não foi possível carregar os usuários");
  return data.users || [];
}

export async function updateSiteUserLevel(userId, accessLevel) {
  const res = await fetch("/api/auth/site-users", {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ userId, accessLevel }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erro ao salvar nível de acesso");
  return data.user;
}

export function formatAccessLevel(level) {
  if (level === "super_admin") return "Super admin";
  if (level === "admin") return "Admin";
  if (level === "basic") return "Básico (somente leitura)";
  return level || "—";
}

export const SUPER_ADMIN_EMAIL = "nousdynamicslta@gmail.com";
