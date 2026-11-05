import { randomUUID } from "node:crypto";
import { getD1 } from "./bindings.js";

/** Não repassa detalhes de SQL ao cliente; o erro original fica no log do Worker. */
async function withDbErrors(operation) {
  try {
    return await operation();
  } catch (err) {
    if (err?.status) throw err;
    console.error("[d1]", err);
    throw Object.assign(new Error("Falha ao acessar o banco de dados"), { status: 502 });
  }
}

export function readD1Collection(name) {
  return withDbErrors(async () => {
    const row = await getD1().prepare("SELECT data FROM cms_collections WHERE name = ?").bind(name).first();
    return row ? JSON.parse(row.data) : null;
  });
}

export function readAllD1Collections() {
  return withDbErrors(async () => {
    const { results } = await getD1().prepare("SELECT name, data FROM cms_collections").all();
    return Object.fromEntries(results.map((row) => [row.name, JSON.parse(row.data)]));
  });
}

export function writeD1Collection(name, payload) {
  return withDbErrors(() =>
    getD1()
      .prepare(
        `INSERT INTO cms_collections (name, data, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (name) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      )
      .bind(name, JSON.stringify(payload), new Date().toISOString())
      .run(),
  );
}

export function readD1CmsUserByEmail(email) {
  return withDbErrors(() =>
    getD1()
      .prepare("SELECT * FROM cms_users WHERE email = ?")
      .bind(String(email).trim().toLowerCase())
      .first(),
  );
}

export function listD1CmsUsers() {
  return withDbErrors(async () => {
    const { results } = await getD1()
      .prepare("SELECT id, email, access_level, created_at, updated_at FROM cms_users ORDER BY created_at DESC")
      .all();
    return results;
  });
}

export function insertD1CmsUser({ email, passwordHash, accessLevel }) {
  const now = new Date().toISOString();
  return withDbErrors(() =>
    getD1()
      .prepare(
        `INSERT INTO cms_users (id, email, password_hash, access_level, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
      )
      .bind(randomUUID(), String(email).trim().toLowerCase(), passwordHash, accessLevel, now, now)
      .first(),
  );
}

export function updateD1CmsUser(id, { email, passwordHash, accessLevel }) {
  const assignments = ["updated_at = ?"];
  const values = [new Date().toISOString()];
  const set = (column, value) => {
    assignments.push(`${column} = ?`);
    values.push(value);
  };

  if (email !== undefined) set("email", String(email).trim().toLowerCase());
  if (passwordHash !== undefined) set("password_hash", passwordHash);
  if (accessLevel !== undefined) set("access_level", accessLevel);

  return withDbErrors(async () => {
    const row = await getD1()
      .prepare(`UPDATE cms_users SET ${assignments.join(", ")} WHERE id = ? RETURNING *`)
      .bind(...values, id)
      .first();

    if (!row) {
      throw Object.assign(new Error("Usuário não encontrado"), { status: 404 });
    }
    return row;
  });
}

export function insertD1GuideLead(lead) {
  return withDbErrors(() =>
    getD1()
      .prepare(
        `INSERT INTO guide_leads (id, course_slug, course_title, nome, email, telefone, consent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        randomUUID(),
        lead.courseSlug,
        lead.courseTitle || "",
        lead.nome,
        lead.email,
        lead.telefone,
        lead.consent === true ? 1 : 0,
        lead.createdAt || new Date().toISOString(),
      )
      .run(),
  );
}
