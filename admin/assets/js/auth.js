const TOKEN_KEY = "cms_session_token";
const USER_KEY = "cms_session_user";
const EMAIL_KEY = "cms_session_email";
const ACCESS_LEVEL_KEY = "cms_session_access_level";

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  return sessionStorage.getItem(USER_KEY);
}

export function getEmail() {
  return sessionStorage.getItem(EMAIL_KEY) || "";
}

export function getAccessLevel() {
  return sessionStorage.getItem(ACCESS_LEVEL_KEY) || "basic";
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function setSession(token, user, email = "", accessLevel = "") {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, user);
  sessionStorage.setItem(EMAIL_KEY, email || "");
  if (accessLevel) {
    sessionStorage.setItem(ACCESS_LEVEL_KEY, accessLevel);
  }
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(EMAIL_KEY);
  sessionStorage.removeItem(ACCESS_LEVEL_KEY);
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return token
    ? { ...extra, Authorization: `Bearer ${token}` }
    : { ...extra };
}

export async function login(username, password) {
  let res;
  try {
    res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error("API do CMS indisponível. Verifique o deploy na Vercel.");
  }

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json().catch(() => ({}))
    : {};

  if (!res.ok) {
    if (res.status === 404 || res.status === 405) {
      throw new Error("API do CMS indisponível. Verifique o deploy na Vercel.");
    }
    if (res.status >= 500) {
      throw new Error("API do CMS indisponível. Tente novamente em instantes.");
    }
    throw new Error(data.error || "Usuário ou senha incorretos");
  }

  setSession(data.token, data.user, data.email, data.accessLevel);
  try {
    const profile = await fetchAccountProfile();
    setSession(data.token, profile.user, profile.email, profile.accessLevel);
  } catch { /* perfil opcional no login */ }
  return data;
}

export async function fetchAccountProfile() {
  const res = await fetch("/api/auth/account", { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Não foi possível carregar a conta");
  setSession(getToken(), data.user, data.email, data.accessLevel);
  return data;
}

export async function updateAccount(payload) {
  const res = await fetch("/api/auth/account", {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Não foi possível atualizar a conta");
  setSession(getToken(), data.user, data.email, data.accessLevel);
  return data;
}

export async function verifySession() {
  const token = getToken();
  if (!token) return false;

  try {
    const res = await fetch("/api/auth/me", {
      headers: authHeaders(),
    });
    if (!res.ok) {
      clearSession();
      return false;
    }
    const data = await res.json();
    if (data.user) {
      sessionStorage.setItem(USER_KEY, data.user);
      sessionStorage.setItem(EMAIL_KEY, data.email || "");
      sessionStorage.setItem(ACCESS_LEVEL_KEY, data.accessLevel || "basic");
    }
    return true;
  } catch {
    clearSession();
    return false;
  }
}

export async function logout() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: authHeaders(),
    });
  } catch { /* ignore */ }
  clearSession();
}
