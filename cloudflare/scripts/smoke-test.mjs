#!/usr/bin/env node
/**
 * Confere um deploy do Worker comparando com o site de referência. Só leitura:
 * não cria conta, não autentica e não grava nada.
 *
 * Uso: node scripts/smoke-test.mjs <url-do-worker> <url-de-referencia> [--media]
 * --media baixa todos os arquivos do último backup e confere o SHA-256.
 */
import { createHash, randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [baseArg, referenceArg] = process.argv.slice(2);
const BASE = baseArg?.replace(/\/$/, "");
const REFERENCE = referenceArg?.replace(/\/$/, "");
if (!BASE || !REFERENCE) {
  console.error("Uso: node scripts/smoke-test.mjs <url-do-worker> <url-de-referencia> [--media]");
  process.exit(2);
}

let failures = 0;
function check(name, ok, detail = "") {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${!ok && detail !== "" ? ` -> ${detail}` : ""}`);
}

const get = (origin, path, options = {}) => fetch(origin + path, { redirect: "manual", ...options });

/** O que muda de propósito entre os dois sites não conta como diferença. */
function normalize(html) {
  return html
    .replaceAll("https://sjokgfvaszczuisavuwb.supabase.co/storage/v1/object/public/cms-media/", "/api/media/")
    .replace(/\r\n/g, "\n") // arquivos locais em CRLF; a Vercel publicou a partir de LF
    .replace(/\s+$/g, "");
}

async function firstDifference(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) return `pos ${i}: worker="${a.slice(i, i + 70)}" ref="${b.slice(i, i + 70)}"`;
  }
  return "";
}

async function compareWithReference(path) {
  const [mine, theirs] = await Promise.all([get(BASE, path), get(REFERENCE, path)]);
  check(`${path} status igual (${theirs.status})`, mine.status === theirs.status, mine.status);
  if (mine.status !== 200 || theirs.status !== 200) return;

  const [mineText, theirText] = await Promise.all([mine.text(), theirs.text()]);
  const a = normalize(mineText);
  const b = normalize(theirText);
  check(`${path} conteúdo igual`, a === b, await firstDifference(a, b));
}

const catalogRes = await get(BASE, "/api/catalog");
const catalog = await catalogRes.json().catch(() => ({}));
check("catálogo responde", catalogRes.status === 200 && catalog.courses?.length > 0, catalogRes.status);

const pages = [
  "/",
  "/admin",
  "/admin/cadastro",
  "/politica-de-privacidade",
  "/termos-de-uso",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/paginas-de-cursos",
  "/pos-graduacao",
  "/nao-existe",
  "/api/catalog",
  ...(catalog.courses || []).map((course) => course.url),
];
for (const path of pages) await compareWithReference(path);

for (const [path, status, location] of [
  ["/cadastro", 307, "/admin/cadastro"],
  ["/pos-graduacao/ensino-do-bale-classico", 308, "/pos-graduacao/ensino-do-bale-classico-turma-4"],
  ["/admin/", 307, null],
  ["/index.html", 307, null],
]) {
  const res = await get(BASE, path);
  const redirected = [301, 302, 307, 308].includes(res.status);
  const sameTarget = location === null || res.headers.get("location")?.endsWith(location);
  check(`redirect ${path}`, status && redirected && sameTarget, `${res.status} ${res.headers.get("location")}`);
}

for (const path of ["/.env", "/package.json", "/lib/cms.js", "/api/handler.js", "/backups/x", "/cloudflare.config.ts", "/_headers", "/data/cms/courses.json"]) {
  const res = await get(BASE, path);
  check(`não expõe ${path}`, res.status === 404, res.status);
}

const coursePath = catalog.courses?.[0]?.url;
if (coursePath) {
  const res = await get(BASE, coursePath, { method: "HEAD" });
  check("HEAD em página de curso", res.status === 200, res.status);
  check("segurança: nosniff", res.headers.get("x-content-type-options") === "nosniff");
  check("segurança: frame", res.headers.get("x-frame-options") === "SAMEORIGIN");
}

const home = await get(BASE, "/");
check("segurança nos assets", home.headers.get("x-content-type-options") === "nosniff");
const admin = await get(BASE, "/admin");
check("admin noindex", (admin.headers.get("x-robots-tag") || "").includes("noindex"));

const unauthorized = await get(BASE, "/api/cms");
check("/api/cms exige login", unauthorized.status === 401, unauthorized.status);
check("/api/cms sem cache", unauthorized.headers.get("cache-control") === "no-store", unauthorized.headers.get("cache-control"));

// Conta inexistente: passa pelo banco e não autentica ninguém.
const fakeLogin = await get(BASE, "/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: `naoexiste-${Date.now()}@example.test`, password: randomBytes(8).toString("hex") }),
});
check("login inexistente dá 401 (D1 respondeu)", fakeLogin.status === 401, fakeLogin.status);

// Corpo grande, sem ler: no Vite preview o proxy local devolve 500; aqui tem que ser 401.
const badUpload = await get(BASE, "/api/media/direct-upload?token=abc.def", {
  method: "PUT",
  headers: { "Content-Type": "video/mp4" },
  body: randomBytes(2 * 1024 * 1024),
});
check("token de upload inválido dá 401", badUpload.status === 401, badUpload.status);

if (process.argv.includes("--media")) {
  const backups = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "backups");
  const latest = (await readdir(backups)).filter((name) => name.startsWith("supabase-")).sort().at(-1);
  const { objects } = JSON.parse(await readFile(join(backups, latest, "manifest.json"), "utf8"));
  const queue = [...objects];
  const wrong = [];
  let verified = 0;

  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let object = queue.shift(); object; object = queue.shift()) {
        const res = await fetch(`${BASE}/api/media/${object.path}`);
        const hash = createHash("sha256").update(Buffer.from(await res.arrayBuffer())).digest("hex");
        if (res.status === 200 && hash === object.sha256) verified += 1;
        else wrong.push(`${object.path}: HTTP ${res.status}`);
      }
    }),
  );

  check(`mídia: ${verified} de ${objects.length} com SHA-256 igual`, !wrong.length, wrong.slice(0, 5).join("; "));
}

console.log(failures ? `\n${failures} falha(s)` : "\ntudo ok");
process.exit(failures ? 1 : 0);
