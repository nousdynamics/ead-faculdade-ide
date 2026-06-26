import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { list } from "@vercel/blob";
import { hasBlobStorage, writeBlob, getBlobClientOptions } from "./blob-storage.js";
import { getStorageProvider } from "./storage-provider.js";
import {
  readSupabaseCmsUserByEmail,
  insertSupabaseCmsUser,
  updateSupabaseCmsUser,
  listSupabaseCmsUsers,
} from "./supabase/cms-storage.js";

const scryptAsync = promisify(scrypt);

export const SUPER_ADMIN_EMAIL = "nousdynamicslta@gmail.com";
export const ACCESS_LEVELS = ["super_admin", "admin", "basic"];

const BLOB_USERS_PATH = "cms/users.json";
const REPO_USERS_PATH = join(process.cwd(), "data", "cms", "users.json");

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function isSuperAdminEmail(email) {
  return normalizeEmail(email) === SUPER_ADMIN_EMAIL.toLowerCase();
}

export function canWrite(accessLevel) {
  return accessLevel === "super_admin" || accessLevel === "admin";
}

export function canManageUsers(accessLevel) {
  return accessLevel === "super_admin";
}

export function formatAccessLevelLabel(level) {
  if (level === "super_admin") return "Super admin";
  if (level === "admin") return "Admin";
  if (level === "basic") return "Básico (somente leitura)";
  return level || "—";
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hash] = storedHash.split(":");
  const derived = await scryptAsync(password, salt, 64);
  const hashBuf = Buffer.from(hash, "hex");
  if (hashBuf.length !== derived.length) return false;
  return timingSafeEqual(hashBuf, derived);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    username: row.email,
    passwordHash: row.password_hash || row.passwordHash,
    accessLevel: row.access_level || row.accessLevel || "basic",
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

function toProfile(user) {
  return {
    user: user.email,
    email: user.email,
    accessLevel: user.accessLevel,
    isSuperAdmin: user.accessLevel === "super_admin",
    canWrite: canWrite(user.accessLevel),
    canManageUsers: canManageUsers(user.accessLevel),
  };
}

async function readLocalUsers() {
  if (hasBlobStorage()) {
    try {
      const { blobs } = await list({ prefix: BLOB_USERS_PATH, limit: 5, ...getBlobClientOptions() });
      const match = blobs.find((blob) => blob.pathname === BLOB_USERS_PATH);
      if (match) {
        const res = await fetch(match.url);
        if (res.ok) return res.json();
      }
    } catch { /* fallthrough */ }
  }

  try {
    const raw = await readFile(REPO_USERS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeLocalUsers(users) {
  const payload = JSON.stringify(users, null, 2) + "\n";
  if (hasBlobStorage()) {
    await writeBlob(BLOB_USERS_PATH, payload);
    return;
  }
  await mkdir(dirname(REPO_USERS_PATH), { recursive: true });
  await writeFile(REPO_USERS_PATH, payload, "utf8");
}

async function findUserByLogin(login) {
  const email = normalizeEmail(login);
  if (!email) return null;

  if (getStorageProvider() === "supabase") {
    const row = await readSupabaseCmsUserByEmail(email);
    return mapUser(row);
  }

  const users = await readLocalUsers();
  return users.find((u) => normalizeEmail(u.email) === email) || null;
}

export async function verifyUserLogin(login, password) {
  const user = await findUserByLogin(login);
  if (!user?.passwordHash) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? user : null;
}

export async function getUserProfile(login) {
  const user = await findUserByLogin(login);
  if (!user) {
    throw Object.assign(new Error("Conta não encontrada"), { status: 404 });
  }
  return toProfile(user);
}

export async function isRegistrationAvailable() {
  return true;
}

export async function registerUser({ email, password }) {
  const normalized = normalizeEmail(email);
  const nextPassword = String(password ?? "");

  if (!isValidEmail(normalized)) {
    throw Object.assign(new Error("E-mail inválido"), { status: 400 });
  }

  if (nextPassword.length < 8) {
    throw Object.assign(new Error("A senha deve ter pelo menos 8 caracteres"), { status: 400 });
  }

  const existing = await findUserByLogin(normalized);
  if (existing) {
    throw Object.assign(new Error("Este e-mail já está cadastrado."), { status: 409 });
  }

  const accessLevel = isSuperAdminEmail(normalized) ? "super_admin" : "basic";
  const passwordHash = await hashPassword(nextPassword);

  if (getStorageProvider() === "supabase") {
    const row = await insertSupabaseCmsUser({ email: normalized, passwordHash, accessLevel });
    return toProfile(mapUser(row));
  }

  const users = await readLocalUsers();
  const user = {
    id: randomBytes(16).toString("hex"),
    email: normalized,
    passwordHash,
    accessLevel,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users.push(user);
  await writeLocalUsers(users);
  return toProfile(user);
}

export async function updateOwnProfile(login, { email, currentPassword, newPassword }) {
  const user = await findUserByLogin(login);
  if (!user) {
    throw Object.assign(new Error("Conta não encontrada"), { status: 404 });
  }

  if (!canWrite(user.accessLevel)) {
    throw Object.assign(new Error("Seu acesso é somente leitura."), { status: 403 });
  }

  let nextEmail = user.email;

  if (email !== undefined) {
    const trimmed = normalizeEmail(email);
    if (trimmed && !isValidEmail(trimmed)) {
      throw Object.assign(new Error("E-mail inválido"), { status: 400 });
    }
    if (trimmed && trimmed !== user.email) {
      const taken = await findUserByLogin(trimmed);
      if (taken && taken.id !== user.id) {
        throw Object.assign(new Error("Este e-mail já está em uso."), { status: 409 });
      }
      nextEmail = trimmed;
    }
  }

  let passwordHash = user.passwordHash;

  if (newPassword !== undefined) {
    const next = String(newPassword);
    if (next.length < 8) {
      throw Object.assign(new Error("A nova senha deve ter pelo menos 8 caracteres"), { status: 400 });
    }
    const validCurrent = await verifyPassword(String(currentPassword || ""), user.passwordHash);
    if (!validCurrent) {
      throw Object.assign(new Error("Senha atual incorreta"), { status: 401 });
    }
    passwordHash = await hashPassword(next);
  }

  const accessLevel = isSuperAdminEmail(nextEmail) ? "super_admin" : user.accessLevel;

  if (getStorageProvider() === "supabase") {
    const row = await updateSupabaseCmsUser(user.id, {
      email: nextEmail,
      passwordHash,
      accessLevel,
    });
    return toProfile(mapUser(row));
  }

  const users = await readLocalUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  users[idx] = {
    ...users[idx],
    email: nextEmail,
    passwordHash,
    accessLevel,
    updatedAt: new Date().toISOString(),
  };
  await writeLocalUsers(users);
  return toProfile(users[idx]);
}

export async function listCmsUsers() {
  if (getStorageProvider() === "supabase") {
    const rows = await listSupabaseCmsUsers();
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      access_level: row.access_level,
      created_at: row.created_at,
    }));
  }

  const users = await readLocalUsers();
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    access_level: u.accessLevel || u.access_level || "basic",
    created_at: u.createdAt || u.created_at,
  }));
}

export async function updateCmsUserAccessLevel(userId, newLevel) {
  if (!userId) {
    throw Object.assign(new Error("Usuário inválido"), { status: 400 });
  }

  if (!["admin", "basic"].includes(newLevel)) {
    throw Object.assign(new Error("Nível de acesso inválido"), { status: 400 });
  }

  if (getStorageProvider() === "supabase") {
    const rows = await listSupabaseCmsUsers();
    const target = rows.find((row) => row.id === userId);
    if (!target) {
      throw Object.assign(new Error("Usuário não encontrado"), { status: 404 });
    }
    if (target.access_level === "super_admin" || isSuperAdminEmail(target.email)) {
      throw Object.assign(new Error("O super admin não pode ser alterado."), { status: 403 });
    }
    const row = await updateSupabaseCmsUser(userId, { accessLevel: newLevel });
    return {
      id: row.id,
      email: row.email,
      access_level: row.access_level,
      created_at: row.created_at,
    };
  }

  const users = await readLocalUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) {
    throw Object.assign(new Error("Usuário não encontrado"), { status: 404 });
  }
  if (users[idx].accessLevel === "super_admin" || isSuperAdminEmail(users[idx].email)) {
    throw Object.assign(new Error("O super admin não pode ser alterado."), { status: 403 });
  }
  users[idx].accessLevel = newLevel;
  users[idx].updatedAt = new Date().toISOString();
  await writeLocalUsers(users);
  return {
    id: users[idx].id,
    email: users[idx].email,
    access_level: users[idx].accessLevel,
    created_at: users[idx].createdAt,
  };
}

// Compatibilidade com imports legados
export const verifyAccountLogin = async (login, password) => Boolean(await verifyUserLogin(login, password));
export const getAccountProfile = getUserProfile;
export const updateAccountProfile = updateOwnProfile;
export const registerCmsAccount = registerUser;
