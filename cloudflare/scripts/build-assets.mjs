#!/usr/bin/env node
/**
 * Monta cloudflare/build/public, a pasta de assets estáticos do Worker.
 * É lista de inclusão de propósito: a raiz do repositório tem .env, backups e scripts.
 */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CLOUDFLARE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = join(CLOUDFLARE_DIR, "..");
const OUT = join(CLOUDFLARE_DIR, "build", "public");
const INCLUDE = [
  "index.html",
  "404.html",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "admin",
  "assets",
  "politica-de-privacidade",
  "termos-de-uso",
];

// Equivalente aos "headers" do vercel.json. Só vale para assets; as respostas
// do Worker recebem os seus em worker/index.js.
const HEADERS = `/assets/*
  Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800

/admin
  X-Robots-Tag: noindex, nofollow

/admin/*
  X-Robots-Tag: noindex, nofollow

/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

https://ead-faculdade-ide.nathalia-25e.workers.dev/*
  X-Robots-Tag: noindex
`;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const entry of INCLUDE) {
  await cp(join(REPO_ROOT, entry), join(OUT, entry), { recursive: true });
}

await writeFile(join(OUT, "_headers"), HEADERS);
console.log(`assets em ${OUT}`);
