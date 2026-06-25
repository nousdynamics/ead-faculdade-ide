import { createClient } from "@supabase/supabase-js";

let adminClient = null;

export function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.trim().replace(/\/$/, "") || "";
}

export function getSupabaseMediaBucket() {
  return process.env.SUPABASE_MEDIA_BUCKET?.trim() || "cms-media";
}

export function hasSupabase() {
  return Boolean(getSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export function getSupabaseAdmin() {
  if (!hasSupabase()) {
    throw Object.assign(
      new Error("Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."),
      { status: 503 },
    );
  }

  if (!adminClient) {
    adminClient = createClient(getSupabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}

export function getSupabaseMediaPublicUrl(objectPath) {
  const path = String(objectPath || "").replace(/^\/+/, "");
  return `${getSupabaseUrl()}/storage/v1/object/public/${getSupabaseMediaBucket()}/${path}`;
}
