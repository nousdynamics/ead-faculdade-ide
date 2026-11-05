#!/usr/bin/env node
/**
 * Backup do D1 e do R2 em backups/cloudflare-AAAA-MM-DD/, no mesmo formato de
 * scripts/backup-supabase.mjs. Para restaurar:
 *   node scripts/import-from-backup.mjs --media --backup ../backups/cloudflare-AAAA-MM-DD
 *
 * Só leitura na Cloudflare. A pasta gerada tem hashes de senha: fica fora do Git.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATABASE_ID = "3d550df8-e81a-4d82-b1af-ec2958a625ba";
const BUCKET = "ead-faculdade-ide-media";
const TABLES = ["cms_collections", "cms_users", "guide_leads"];

const CLOUDFLARE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = join(CLOUDFLARE_DIR, "..");

async function loadCredentials() {
  const credentials = { ...process.env };
  for (const line of (await readFile(join(REPO_ROOT, ".env"), "utf8")).split(/\r?\n/)) {
    const match = line.match(/^(CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID)=(.*)$/);
    if (match && !credentials[match[1]]) credentials[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
  if (!credentials.CLOUDFLARE_API_TOKEN || !credentials.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error("Defina CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID no .env da raiz.");
  }
  return credentials;
}

const { CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT } = await loadCredentials();
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}`;
const auth = { Authorization: `Bearer ${TOKEN}` };

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...auth, ...options.headers } });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(`${path}: HTTP ${res.status} ${JSON.stringify(body.errors)}`);
  return body;
}

async function readTable(name) {
  const { result } = await api(`/d1/database/${DATABASE_ID}/raw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql: `SELECT * FROM ${name}` }),
  });
  const { columns, rows } = result[0].results;
  const records = rows.map((row) => Object.fromEntries(columns.map((column, i) => [column, row[i]])));
  // No Supabase "data" é jsonb; o importador espera objeto, não texto.
  return name === "cms_collections" ? records.map((r) => ({ ...r, data: JSON.parse(r.data) })) : records;
}

async function listObjects() {
  const objects = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ per_page: "1000", ...(cursor && { cursor }) });
    const body = await api(`/r2/buckets/${BUCKET}/objects?${query}`);
    objects.push(...body.result);
    cursor = body.result_info?.is_truncated ? body.result_info.cursor : "";
  } while (cursor);
  return objects;
}

async function downloadObject(key) {
  const res = await fetch(`${API}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`, { headers: auth });
  if (!res.ok) throw new Error(`${key}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const date = new Date().toISOString().slice(0, 10);
const outDir = join(REPO_ROOT, "backups", `cloudflare-${date}`);
await mkdir(join(outDir, "tables"), { recursive: true });

const counts = {};
for (const table of TABLES) {
  const records = await readTable(table);
  counts[table] = records.length;
  await writeFile(join(outDir, "tables", `${table}.json`), JSON.stringify(records, null, 2));
}
console.log(`pasta: ${outDir}`);
console.log(`tabelas: ${JSON.stringify(counts)}`);

const listed = await listObjects();
const queue = [...listed];
const manifest = [];
const failures = [];

await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let object = queue.shift(); object; object = queue.shift()) {
      try {
        const bytes = await downloadObject(object.key);
        if (bytes.length !== object.size) throw new Error(`tamanho ${bytes.length}, esperado ${object.size}`);
        const file = join(outDir, "media", ...object.key.split("/"));
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, bytes);
        manifest.push({
          path: object.key,
          size: object.size,
          contentType: object.http_metadata?.contentType || "application/octet-stream",
          sha256: createHash("sha256").update(bytes).digest("hex"),
        });
      } catch (err) {
        failures.push(`${object.key}: ${err.message}`);
      }
    }
  }),
);

manifest.sort((a, b) => a.path.localeCompare(b.path));
await writeFile(
  join(outDir, "manifest.json"),
  JSON.stringify({ source: "cloudflare", createdAt: new Date().toISOString(), tables: counts, objects: manifest }, null, 2),
);

console.log(`arquivos: ${manifest.length} de ${listed.length}`);
if (failures.length) {
  console.error(`Falhas:\n${failures.join("\n")}`);
  process.exit(1);
}
