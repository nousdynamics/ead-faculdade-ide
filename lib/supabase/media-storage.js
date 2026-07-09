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

/**
 * URL assinada de upload — o navegador envia o arquivo direto ao Supabase
 * Storage (PUT), sem passar pelo limite de body das functions da Vercel.
 */
export async function createSignedMediaUpload(objectPath) {
  const supabase = getSupabaseAdmin();
  const path = String(objectPath || "").replace(/^\/+/, "");

  const { data, error } = await supabase.storage
    .from(getSupabaseMediaBucket())
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data?.signedUrl) {
    throw Object.assign(new Error(error?.message || "Falha ao criar URL de upload"), { status: 502 });
  }

  return {
    path,
    signedUrl: data.signedUrl,
    token: data.token,
    publicUrl: getSupabaseMediaPublicUrl(path),
  };
}
