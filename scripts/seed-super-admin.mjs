/**
 * Cria (ou atualiza) o super admin nousdynamicslta@gmail.com via Supabase Admin API.
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadProjectEnv } from "./load-env.mjs";

const SUPER_ADMIN_EMAIL = "nousdynamicslta@gmail.com";

function randomPassword() {
  return randomBytes(12).toString("base64url") + "A1!";
}

async function main() {
  await loadProjectEnv();

  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    console.error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const password = randomPassword();
  let userId;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: SUPER_ADMIN_EMAIL,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Super Admin IDE" },
  });

  if (createError) {
    if (!/already|registered|exists/i.test(createError.message)) {
      throw createError;
    }

    const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;

    const existing = list.users.find((u) => u.email?.toLowerCase() === SUPER_ADMIN_EMAIL);
    if (!existing) throw new Error("Usuário existe mas não foi encontrado na listagem.");

    userId = existing.id;

    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: "Super Admin IDE" },
    });
    if (updateAuthError) throw updateAuthError;

    console.log("· Conta existente atualizada");
  } else {
    userId = created.user.id;
    console.log("✓ Conta super admin criada");
  }

  const { error: profileError } = await supabase.from("user_profiles").upsert(
    {
      id: userId,
      full_name: "Super Admin IDE",
      access_level: "super_admin",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profileError) throw profileError;

  console.log(`✓ Perfil super_admin vinculado (${SUPER_ADMIN_EMAIL})`);
  console.log("\nCredenciais temporárias (altere após o primeiro login):");
  console.log(`  E-mail: ${SUPER_ADMIN_EMAIL}`);
  console.log(`  Senha:  ${password}`);
  console.log("\nEntrada: https://ead-faculdade-ide.vercel.app/entrar");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
