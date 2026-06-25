import { getSupabaseAdmin, getSupabaseMediaBucket, getSupabaseMediaPublicUrl } from "./client.js";

export async function uploadSupabaseMedia(objectPath, buffer, contentType) {
  const supabase = getSupabaseAdmin();
  const path = String(objectPath || "").replace(/^\/+/, "");

  const { error } = await supabase.storage.from(getSupabaseMediaBucket()).upload(path, buffer, {
    contentType,
    upsert: true,
    cacheControl: "31536000",
  });

  if (error) {
    throw Object.assign(new Error(error.message), { status: 502 });
  }

  return {
    path,
    publicUrl: getSupabaseMediaPublicUrl(path),
  };
}

export async function downloadSupabaseMedia(objectPath) {
  const supabase = getSupabaseAdmin();
  const path = String(objectPath || "").replace(/^\/+/, "");

  const { data, error } = await supabase.storage.from(getSupabaseMediaBucket()).download(path);
  if (error || !data) return null;

  const buffer = Buffer.from(await data.arrayBuffer());
  return { buffer, publicUrl: getSupabaseMediaPublicUrl(path) };
}

export function getSupabaseMediaRedirect(objectPath) {
  return getSupabaseMediaPublicUrl(objectPath);
}
