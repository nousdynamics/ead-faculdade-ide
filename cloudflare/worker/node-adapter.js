/**
 * Roda um handler no estilo Vercel/Node (req, res) dentro do Worker.
 * O router só usa res.status/setHeader/end e lê o corpo de req.body, então esse
 * subconjunto basta. Mídia não passa por aqui: vai em streaming (worker/media.js).
 */
export async function runNodeHandler(request, handler, { query = {} } = {}) {
  const url = new URL(request.url);
  const isHead = request.method === "HEAD";
  const hasBody = !isHead && request.method !== "GET";

  const req = {
    // HEAD roda como GET: validadores de link recebem o mesmo status e cabeçalhos.
    method: isHead ? "GET" : request.method,
    url: url.pathname + url.search,
    headers: Object.fromEntries(request.headers),
    query: { ...Object.fromEntries(url.searchParams), ...query },
    body: hasBody ? Buffer.from(await request.arrayBuffer()) : undefined,
  };

  const headers = new Headers();
  let status = 200;
  let body;
  const res = {
    headersSent: false,
    status(code) {
      status = code;
      return res;
    },
    setHeader(name, value) {
      headers.set(name, String(value));
      return res;
    },
    getHeader(name) {
      return headers.get(name) ?? undefined;
    },
    end(chunk) {
      body = chunk;
      res.headersSent = true;
    },
  };

  await handler(req, res);

  if (!res.headersSent) {
    throw new Error(`Handler terminou sem responder: ${url.pathname}`);
  }

  const emptyBody = isHead || status === 204 || status === 304;
  return new Response(emptyBody ? null : body, { status, headers });
}
