import { hasBlobStorage, hasMediaBlobStorage } from "./blob-storage.js";
import { hasSupabase } from "./supabase/client.js";

/**
 * Prioridade: Supabase → Vercel Blob → filesystem local (dev).
 * Defina STORAGE_PROVIDER=supabase|blob|local para forçar um backend.
 */
export function getStorageProvider() {
  const forced = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (forced === "supabase") return hasSupabase() ? "supabase" : "local";
  if (forced === "blob") return hasBlobStorage() ? "blob" : "local";
  if (forced === "local") return "local";

  if (hasSupabase()) return "supabase";
  if (hasBlobStorage()) return "blob";
  return "local";
}

export function getMediaStorageProvider() {
  const forced = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
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
