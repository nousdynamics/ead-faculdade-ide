import { getSupabaseUrl } from "./client.js";

export function getPublicSupabaseConfig() {
  const url = getSupabaseUrl();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim() || "";

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function renderSupabaseConfigScript() {
  const config = getPublicSupabaseConfig();
  if (!config) return "";

  const json = JSON.stringify(config).replace(/</g, "\\u003c");
  return `<script>window.__SUPABASE__=${json};</script>`;
}
