import { getSupabaseAdmin } from "./client.js";

export async function readSupabaseCollection(name) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("cms_collections")
    .select("data")
    .eq("name", name)
    .maybeSingle();

  if (error) {
    throw Object.assign(new Error(error.message), { status: 502 });
  }

  if (!data) return null;
  return data.data;
}

export async function writeSupabaseCollection(name, payload) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("cms_collections").upsert(
    {
      name,
      data: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "name" },
  );

  if (error) {
    throw Object.assign(new Error(error.message), { status: 502 });
  }
}

export async function readSupabaseAccount() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("cms_account").select("*").eq("id", 1).maybeSingle();

  if (error) {
    throw Object.assign(new Error(error.message), { status: 502 });
  }

  if (!data) return null;

  return {
    username: data.username,
    passwordHash: data.password_hash,
    email: data.email || "",
  };
}

export async function writeSupabaseAccount(account) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("cms_account").upsert(
    {
      id: 1,
      username: account.username,
      password_hash: account.passwordHash,
      email: account.email || "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw Object.assign(new Error(error.message), { status: 502 });
  }
}

export async function insertSupabaseGuideLead(lead) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("guide_leads").insert({
    course_slug: lead.courseSlug,
    course_title: lead.courseTitle || "",
    nome: lead.nome,
    email: lead.email,
    telefone: lead.telefone,
    consent: lead.consent === true,
    created_at: lead.createdAt || new Date().toISOString(),
  });

  if (error) {
    throw Object.assign(new Error(error.message), { status: 502 });
  }
}
