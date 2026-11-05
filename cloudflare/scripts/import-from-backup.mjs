#!/usr/bin/env node
/**
 * Importa um backup de scripts/backup-supabase.mjs para o D1 e, com --media, para o R2.
 * Pode rodar de novo: sobrescreve coleções e usuários. Na virada para o Worker, faça
 * backup + importação de novo, antes que alguém edite algo pelo admin novo.
 *
 * Uso: node scripts/import-from-backup.mjs [--local] [--media] [--backup <pasta>]
 */
import { execFile } from "node:child_process";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const DATABASE_ID = "3d550df8-e81a-4d82-b1af-ec2958a625ba";
const BUCKET = "ead-faculdade-ide-media";
const OLD_MEDIA_BASE = "https://sjokgfvaszczuisavuwb.supabase.co/storage/v1/object/public/cms-media/";

const run = promisify(execFile);
const args = process.argv.slice(2);
const local = args.includes("--local");
const withMedia = args.includes("--media");

const CLOUDFLARE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = join(CLOUDFLARE_DIR, "..");
const CF_BIN = join(CLOUDFLARE_DIR, "node_modules", "cf", "bin", "cf");
const LOCAL_FLAGS = ["--local", "--persist-to", join(CLOUDFLARE_DIR, ".wrangler", "state")];

async function latestBackup() {
  const root = join(REPO_ROOT, "backups");
  const folders = (await readdir(root)).filter((name) => name.startsWith("supabase-")).sort();
  if (!folders.length) throw new Error("Nenhum backup em backups/. Rode npm run backup:supabase na raiz.");
  return join(root, folders.at(-1));
}

async function loadCloudflareCredentials() {
  const credentials = {};
  for (const line of (await readFile(join(REPO_ROOT, ".env"), "utf8")).split(/\r?\n/)) {
    const match = line.match(/^(CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID)=(.*)$/);
    if (match) credentials[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
  return credentials;
}

const backupDir = args.includes("--backup") ? args[args.indexOf("--backup") + 1] : await latestBackup();
const cliEnv = { ...process.env, ...(await loadCloudflareCredentials()), CF_SEND_TELEMETRY: "false" };

function cf(...cliArgs) {
  return run(process.execPath, [CF_BIN, ...cliArgs], { cwd: CLOUDFLARE_DIR, env: cliEnv, maxBuffer: 1 << 26 });
}

const readTable = async (name) => JSON.parse(await readFile(join(backupDir, "tables", `${name}.json`), "utf8"));

/** Depoimentos guardam a URL absoluta do bucket antigo; no Worker a mídia sai de /api/media. */
const pointToWorkerMedia = (data) => JSON.stringify(data).split(OLD_MEDIA_BASE).join("/api/media/");

async function importTables() {
  const collections = await readTable("cms_collections");
  const users = await readTable("cms_users");
  const leads = await readTable("guide_leads");

  const statements = [
    ...collections.map((row) => ({
      sql: "INSERT OR REPLACE INTO cms_collections (name, data, updated_at) VALUES (?, ?, ?)",
      params: [row.name, pointToWorkerMedia(row.data), row.updated_at],
    })),
    ...users.map((row) => ({
      sql: `INSERT OR REPLACE INTO cms_users (id, email, password_hash, access_level, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      params: [row.id, row.email, row.password_hash, row.access_level, row.created_at, row.updated_at],
    })),
    ...leads.map((row) => ({
      sql: `INSERT OR IGNORE INTO guide_leads (id, course_slug, course_title, nome, email, telefone, consent, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [String(row.id), row.course_slug, row.course_title, row.nome, row.email, row.telefone, row.consent ? 1 : 0, row.created_at],
    })),
  ];

  // Arquivo temporário fora do repositório: contém hashes de senha.
  const batchFile = join(tmpdir(), `d1-import-${process.pid}.json`);
  await writeFile(batchFile, JSON.stringify(statements));
  try {
    await cf("d1", "raw", DATABASE_ID, "--batch", `@${batchFile}`, ...(local ? LOCAL_FLAGS : []));
  } finally {
    await rm(batchFile, { force: true });
  }

  console.log(`D1: ${collections.length} coleções, ${users.length} usuários, ${leads.length} leads`);
}

async function importMedia() {
  const { objects } = JSON.parse(await readFile(join(backupDir, "manifest.json"), "utf8"));
  const queue = [...objects];
  const failures = [];
  let done = 0;

  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let object = queue.shift(); object; object = queue.shift()) {
        try {
          await cf(
            "r2", "buckets", "objects", "upload", object.path,
            "--bucket-name", BUCKET,
            "--file", join(backupDir, "media", ...object.path.split("/")),
            "--content-type", object.contentType,
            ...(local ? LOCAL_FLAGS : []),
          );
          done += 1;
        } catch (err) {
          failures.push(`${object.path}: ${String(err.stderr || err.message).trim().slice(0, 200)}`);
        }
      }
    }),
  );

  console.log(`R2: ${done} de ${objects.length} arquivos`);
  if (failures.length) throw new Error(`Falhas no R2:\n${failures.join("\n")}`);
}

console.log(`backup: ${backupDir} | destino: ${local ? "local" : "Cloudflare"}`);
await importTables();
if (withMedia) await importMedia();
