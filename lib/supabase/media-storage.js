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

const VIDEO_PREFIX = "assets/video";

/** Lista todos os vídeos do bucket (assets/video/**, 1 nível de subpasta). */
export async function listSupabaseVideos() {
  const supabase = getSupabaseAdmin();
  const bucket = supabase.storage.from(getSupabaseMediaBucket());

  const listFolder = async (prefix) => {
    const { data, error } = await bucket.list(prefix, {
      limit: 1000,
      sortBy: { column: "updated_at", order: "desc" },
    });
    if (error) {
      throw Object.assign(new Error(error.message), { status: 502 });
    }
    return data || [];
  };

  const root = await listFolder(VIDEO_PREFIX);
  const videos = [];

  for (const entry of root) {
    if (entry.id) {
      // arquivo direto em assets/video/
      videos.push({ entry, folder: "" });
      continue;
    }
    const children = await listFolder(`${VIDEO_PREFIX}/${entry.name}`);
    for (const child of children) {
      if (child.id) videos.push({ entry: child, folder: entry.name });
    }
  }

  return videos.map(({ entry, folder }) => {
    const path = folder ? `${VIDEO_PREFIX}/${folder}/${entry.name}` : `${VIDEO_PREFIX}/${entry.name}`;
    return {
      name: entry.name,
      folder: folder || "—",
      path,
      publicUrl: getSupabaseMediaPublicUrl(path),
      size: entry.metadata?.size ?? null,
      contentType: entry.metadata?.mimetype || "",
      updatedAt: entry.updated_at || entry.created_at || null,
    };
  }).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

/** Remove um objeto de vídeo do bucket (somente sob assets/video/). */
export async function deleteSupabaseVideo(objectPath) {
  const path = String(objectPath || "").replace(/^\/+/, "");
  if (!path.startsWith(`${VIDEO_PREFIX}/`)) {
    throw Object.assign(new Error("Caminho inválido: só é possível excluir vídeos"), { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(getSupabaseMediaBucket()).remove([path]);
  if (error) {
    throw Object.assign(new Error(error.message), { status: 502 });
  }
  return { ok: true, path };
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
