/**
 * Bindings do Worker (D1, R2). Não dá para importar `cloudflare:workers` aqui:
 * estes módulos também são carregados no Node (scripts) e na Vercel.
 */
let bindings = null;

export function setCloudflareBindings(env) {
  bindings = env;
}

export function getD1() {
  if (!bindings?.DB) {
    throw Object.assign(new Error("Banco de dados D1 não configurado."), { status: 503 });
  }
  return bindings.DB;
}

export function getMediaBucket() {
  if (!bindings?.MEDIA) {
    throw Object.assign(new Error("Armazenamento de mídia (R2) não ativado."), { status: 503 });
  }
  return bindings.MEDIA;
}
