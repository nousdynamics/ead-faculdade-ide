/**
 * Remove conta CMS de teste (yeaslest) do Supabase.
 */
import { createClient } from "@supabase/supabase-js";
import { loadProjectEnv } from "./load-env.mjs";

const TEST_USERNAME = "yeaslest";

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

  const { data: before, error: readError } = await supabase
    .from("cms_account")
    .select("id, username, email")
    .eq("username", TEST_USERNAME);

  if (readError) throw readError;

  if (!before?.length) {
    console.log(`· Nenhuma conta CMS "${TEST_USERNAME}" encontrada.`);
    return;
  }

  const { error: delError } = await supabase.from("cms_account").delete().eq("username", TEST_USERNAME);
  if (delError) throw delError;

  console.log(`✓ Conta CMS de teste removida (${TEST_USERNAME})`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
