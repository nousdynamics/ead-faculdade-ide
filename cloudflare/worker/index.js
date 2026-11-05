import handler from "../../api/handler.js";
import { setCloudflareBindings } from "../../lib/cloudflare/bindings.js";
import { sanitizeMediaPath } from "../../lib/media-url.js";
import { receiveVideoUpload, serveMedia } from "./media.js";
import { runNodeHandler } from "./node-adapter.js";

// Equivalente ao vercel.json. Estas rotas também precisam estar em
// assets.runWorkerFirst (cloudflare.config.ts), senão nem chegam ao Worker.
const REDIRECTS = new Map([
  ["/cadastro", { location: "/admin/cadastro", status: 307 }],
  [
    "/pos-graduacao/ensino-do-bale-classico",
    { location: "/pos-graduacao/ensino-do-bale-classico-turma-4", status: 308 },
  ],
]);

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/** Traduz a URL pública para o caminho que o router espera, ou null se é asset estático. */
function apiPathFor(pathname) {
  if (pathname === "/paginas-de-cursos") return "catalog-page";

  const catalog = pathname.match(/^\/paginas-de-cursos\/([^/]+)$/);
  if (catalog) return `catalog-page/${catalog[1]}`;

  const course = pathname.match(/^\/pos-graduacao\/([^/]+)$/);
  if (course) return `course-page/${course[1]}`;

  const api = pathname.match(/^\/api\/(.*)$/);
  if (api) return api[1];

  return null;
}

/** Um % solto na URL não pode virar erro 500. */
function decodePath(path) {
  try {
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

/** Cópia mutável dos cabeçalhos, com o que o vercel.json aplicava a toda resposta. */
function finalize(response, url) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  // Sem isso, respostas sem política explícita (404, 405, redirects) podem entrar no cache do Worker.
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");

  // A URL workers.dev é só de teste: não pode concorrer com o domínio nas buscas.
  if (url.hostname.endsWith(".workers.dev")) headers.set("X-Robots-Tag", "noindex");

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function route(request, env, url) {
  const { pathname, search } = url;

  const redirect = REDIRECTS.get(pathname);
  if (redirect) {
    return new Response(null, { status: redirect.status, headers: { Location: redirect.location } });
  }

  if (pathname.length > 1 && pathname.endsWith("/")) {
    return new Response(null, { status: 308, headers: { Location: pathname.slice(0, -1) + search } });
  }

  const apiPath = apiPathFor(pathname);
  if (apiPath === null) return env.ASSETS.fetch(request);

  if (apiPath === "media/direct-upload" && request.method === "PUT") {
    return receiveVideoUpload(request, env);
  }

  if (apiPath.startsWith("media/") && (request.method === "GET" || request.method === "HEAD")) {
    const mediaPath = sanitizeMediaPath(decodePath(apiPath.slice("media/".length)));
    if (mediaPath) return serveMedia(request, env, mediaPath);
  }

  return runNodeHandler(request, handler, { query: { path: apiPath } });
}

export default {
  async fetch(request, env) {
    setCloudflareBindings(env);
    const url = new URL(request.url);

    try {
      return finalize(await route(request, env, url), url);
    } catch (err) {
      console.error("[worker]", url.pathname, err);
      return finalize(Response.json({ error: "Erro interno do servidor" }, { status: 500 }), url);
    }
  },
};
