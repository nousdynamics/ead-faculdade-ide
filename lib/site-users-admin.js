import { getSupabaseAdmin } from "./supabase/client.js";

export const SUPER_ADMIN_EMAIL = "nousdynamicslta@gmail.com";

export function isSuperAdminEmail(email) {
  return String(email || "").trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

export async function listSiteUsers() {
  const supabase = getSupabaseAdmin();

  const { data: profiles, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, full_name, phone, access_level, created_at")
    .order("created_at", { ascending: false });

  if (profileError) {
    throw Object.assign(new Error(profileError.message), { status: 502 });
  }

  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authError) {
    throw Object.assign(new Error(authError.message), { status: 502 });
  }

  const emailById = new Map(authData.users.map((user) => [user.id, user.email || ""]));

  return (profiles || []).map((profile) => ({
    id: profile.id,
    email: emailById.get(profile.id) || "",
    full_name: profile.full_name || "",
    phone: profile.phone || "",
    access_level: profile.access_level || "basic",
    created_at: profile.created_at,
  }));
}

export async function updateSiteUserAccessLevel(userId, newLevel) {
  if (!userId) {
    throw Object.assign(new Error("Usuário inválido"), { status: 400 });
  }

  if (!["basic", "super_admin"].includes(newLevel)) {
    throw Object.assign(new Error("Nível de acesso inválido"), { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);

  if (authError || !authUser?.user) {
    throw Object.assign(new Error("Usuário não encontrado"), { status: 404 });
  }

  const email = authUser.user.email || "";

  if (newLevel === "super_admin" && !isSuperAdminEmail(email)) {
    throw Object.assign(
      new Error("Somente nousdynamicslta@gmail.com pode ser super admin"),
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .update({ access_level: newLevel, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id, full_name, phone, access_level, created_at")
    .maybeSingle();

  if (error) {
    throw Object.assign(new Error(error.message), { status: 502 });
  }

  if (!data) {
    throw Object.assign(new Error("Perfil não encontrado"), { status: 404 });
  }

  return {
    id: data.id,
    email,
    full_name: data.full_name || "",
    phone: data.phone || "",
    access_level: data.access_level,
    created_at: data.created_at,
  };
}
