/**
 * Envia variáveis Supabase do .env para a Vercel (production, preview, development).
 */
import { spawnSync } from "node:child_process";
import { loadProjectEnv } from "./load-env.mjs";

const VARS = [
  "STORAGE_PROVIDER",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_MEDIA_BUCKET",
  // Auth do CMS — obrigatórias após o hardening (auth falha-fechado sem elas).
  "CMS_SECRET",
  "CMS_USER",
  "CMS_PASSWORD",
];

const ENVS = process.argv.includes("--preview-only")
  ? ["preview"]
  : process.argv.includes("--dev-only")
    ? ["development"]
    : ["production", "preview", "development"];

function addEnv(name, value, target) {
  // `name` e `target` são constantes confiáveis (VARS / ENVS). O segredo (`value`)
  // vai por stdin, nunca no argv: evita exposição em listagem de processos e
  // interpolação de shell quando shell:true (necessário p/ resolver npx no Windows).
  const args = ["vercel", "env", "add", name, target, "--force", "--yes"];
  if (target !== "development") {
    args.push("--sensitive");
  }

  const result = spawnSync("npx", args, {
    encoding: "utf8",
    shell: true,
    input: `${value}\n`,
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(`${name}@${target}: ${err || "falha"}`);
  }

  console.log(`✓ ${name} → ${target}`);
}

async function main() {
  await loadProjectEnv();

  for (const name of VARS) {
    const value = process.env[name]?.trim();
    if (!value) {
      console.warn(`⚠ ${name} ausente no .env — pulando`);
      continue;
    }

    for (const target of ENVS) {
      addEnv(name, value, target);
    }
  }

  console.log("\n✓ Variáveis Supabase enviadas à Vercel");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
