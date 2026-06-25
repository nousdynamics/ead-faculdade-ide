/**
 * Configura Site URL e Redirect URLs do Supabase Auth (Management API).
 *
 * Requer SUPABASE_ACCESS_TOKEN no .env (https://supabase.com/dashboard/account/tokens)
 *
 * Uso: npm run configure:supabase-auth
 */
import { loadProjectEnv } from "./load-env.mjs";

const PROJECT_REF = "sjokgfvaszczuisavuwb";
const API_BASE = "https://api.supabase.com/v1";

const SITE_URL = "https://ead-faculdade-ide.vercel.app";

const REDIRECT_URLS = [
  "https://ead-faculdade-ide.vercel.app/entrar",
  "https://ead-faculdade-ide.vercel.app/auth/callback",
  "https://ead-faculdade-ide.vercel.app/redefinir-senha",
  "https://ead-faculdade-ide.vercel.app/minha-conta",
  "https://ead.faculdadeide.edu.br/entrar",
  "https://ead.faculdadeide.edu.br/auth/callback",
  "https://ead.faculdadeide.edu.br/redefinir-senha",
  "https://ead.faculdadeide.edu.br/minha-conta",
  "http://localhost:3000/entrar",
  "http://localhost:3000/auth/callback",
  "http://127.0.0.1:3000/entrar",
];

function parseAllowList(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeAllowList(existing, required) {
  const merged = new Set([...parseAllowList(existing), ...required]);
  return [...merged].join(",");
}

async function managementFetch(path, { method = "GET", body } = {}) {
  const token =
    process.env.SUPABASE_ACCESS_TOKEN?.trim() ||
    process.env.SUPABASE_API_TOKEN?.trim() ||
    process.env.SUPABSE_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "SUPABASE_ACCESS_TOKEN ausente. Crie em https://supabase.com/dashboard/account/tokens e adicione ao .env",
    );
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message = typeof data === "object" ? data?.message || JSON.stringify(data) : data;
    throw new Error(`${method} ${path} → ${res.status}: ${message}`);
  }

  return data;
}

async function main() {
  await loadProjectEnv();

  const current = await managementFetch(`/projects/${PROJECT_REF}/config/auth`);
  const uriAllowList = mergeAllowList(current.uri_allow_list, REDIRECT_URLS);

  const updated = await managementFetch(`/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    body: {
      site_url: SITE_URL,
      uri_allow_list: uriAllowList,
    },
  });

  console.log("✓ Auth URLs configuradas");
  console.log(`  site_url: ${updated.site_url || SITE_URL}`);
  console.log(`  uri_allow_list: ${updated.uri_allow_list || uriAllowList}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
