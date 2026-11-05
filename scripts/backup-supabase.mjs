#!/usr/bin/env node
/**
 * Copia tudo que está no Supabase para backups/supabase-<data>/ (fora do git).
 * Inclui hashes de senha em tables/cms_users.json — não publicar essa pasta.
 *
 * Uso: node scripts/backup-supabase.mjs
 * O manifesto gerado (manifest.json) é a referência da importação p/ Cloudflare.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

async function loadEnv() {
  const env = {};
  for (const line of (await readFile(".env", "utf8")).split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
  return env;
}

const env = await loadEnv();
const url = env.SUPABASE_URL.replace(/\/$/, "");
const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
const bucket = env.SUPABASE_MEDIA_BUCKET || "cms-media";
const stamp = new Date().toISOString().slice(0, 10);
const root = join("backups", `supabase-${stamp}`);

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n");
}

async function fetchAllRows(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: { ...headers, Range: `${from}-${from + 999}` },
    });
    if (!res.ok && res.status !== 206) throw new Error(`${table}: HTTP ${res.status}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function listObjects(prefix = "") {
  const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } }),
  });
  if (!res.ok) throw new Error(`list ${prefix}: HTTP ${res.status}`);
  const entries = await res.json();
  if (entries.length === 1000) throw new Error(`list ${prefix}: mais de 1000 itens, paginar`);

  const out = [];
  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (!entry.metadata) out.push(...(await listObjects(path)));
    else out.push({ path, size: entry.metadata.size, contentType: entry.metadata.mimetype, updatedAt: entry.updated_at });
  }
  return out;
}

async function downloadObject(object) {
  const encoded = object.path.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${encoded}`, { headers });
  if (!res.ok) throw new Error(`${object.path}: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length !== object.size) {
    throw new Error(`${object.path}: tamanho ${buffer.length}, esperado ${object.size}`);
  }
  const target = join(root, "media", ...object.path.split("/"));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buffer);
  object.sha256 = createHash("sha256").update(buffer).digest("hex");
}

const tables = ["cms_collections", "cms_users", "cms_account", "guide_leads", "app_meta", "user_profiles"];
const tableCounts = {};
for (const table of tables) {
  const rows = await fetchAllRows(table);
  tableCounts[table] = rows.length;
  await writeJson(join(root, "tables", `${table}.json`), rows);
}

const objects = await listObjects();
const queue = [...objects];
const failures = [];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let object = queue.shift(); object; object = queue.shift()) {
      try {
        await downloadObject(object);
      } catch (err) {
        failures.push(err.message);
      }
    }
  }),
);

await writeJson(join(root, "manifest.json"), {
  createdAt: new Date().toISOString(),
  bucket,
  tables: tableCounts,
  mediaFiles: objects.length,
  mediaBytes: objects.reduce((sum, object) => sum + object.size, 0),
  failures,
  objects,
});

console.log("pasta:", root);
console.log("tabelas:", JSON.stringify(tableCounts));
console.log("arquivos:", objects.length - failures.length, "de", objects.length);
if (failures.length) {
  console.error("FALHAS:\n" + failures.join("\n"));
  process.exit(1);
}
