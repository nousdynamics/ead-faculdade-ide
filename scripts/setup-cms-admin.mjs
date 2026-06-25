/**
 * Cria conta CMS de produção (substitui usuário de teste removido).
 */
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { loadProjectEnv } from "./load-env.mjs";

const scryptAsync = promisify(scrypt);
const CMS_USERNAME = "nousdynamicslta@gmail.com";
const CMS_EMAIL = "nousdynamicslta@gmail.com";

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

async function main() {
  await loadProjectEnv();

  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    console.error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
    process.exit(1);
  }

  const password = randomBytes(16).toString("base64url") + "A1!";
  const cmsSecret = randomBytes(32).toString("hex");
  const passwordHash = await hashPassword(password);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from("cms_account").upsert(
    {
      id: 1,
      username: CMS_USERNAME,
      password_hash: passwordHash,
      email: CMS_EMAIL,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) throw error;

  console.log(`✓ Conta CMS criada (${CMS_USERNAME})`);
  console.log("\nCredenciais do painel /admin:");
  console.log(`  E-mail:  ${CMS_USERNAME}`);
  console.log(`  Senha:   ${password}`);
  console.log(`\nCMS_SECRET (para Vercel): ${cmsSecret}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
