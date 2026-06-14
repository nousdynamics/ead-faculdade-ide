const TOKEN_KEY = "cms_session_token";
const USER_KEY = "cms_session_user";

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  return sessionStorage.getItem(USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function setSession(token, user) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, user);
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
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
    throw new Error(data.error || "Usuário ou senha incorretos");
  }

  setSession(data.token, data.user);
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
    if (data.user) sessionStorage.setItem(USER_KEY, data.user);
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
