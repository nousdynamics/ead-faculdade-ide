import { hasBlobStorage, hasMediaBlobStorage } from "./blob-storage.js";
import { hasSupabase } from "./supabase/client.js";

/**
 * Prioridade: Supabase → Vercel Blob → filesystem local (dev).
 * Defina STORAGE_PROVIDER=cloudflare|supabase|blob|local para forçar um backend.
 * "cloudflare" (D1 + R2) só faz sentido dentro do Worker, que é quem define a variável.
 */
export function getStorageProvider() {
  const forced = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (forced === "cloudflare") return "cloudflare";
  if (forced === "supabase") return hasSupabase() ? "supabase" : "local";
  if (forced === "blob") return hasBlobStorage() ? "blob" : "local";
  if (forced === "local") return "local";

  if (hasSupabase()) return "supabase";
  if (hasBlobStorage()) return "blob";
  return "local";
}

export function getMediaStorageProvider() {
  const forced = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (forced === "cloudflare") return "cloudflare";
  if (forced === "supabase") return hasSupabase() ? "supabase" : "local";
  if (forced === "blob") return hasMediaBlobStorage() ? "blob" : "local";
  if (forced === "local") return "local";

  if (hasSupabase()) return "supabase";
  if (hasMediaBlobStorage()) return "blob";
  return "local";
}

export function usesSupabaseStorage() {
  return getStorageProvider() === "supabase";
}

export function usesSupabaseMedia() {
  return getMediaStorageProvider() === "supabase";
}
