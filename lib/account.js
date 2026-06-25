import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { list } from "@vercel/blob";
import { hasBlobStorage, writeBlob, getBlobClientOptions } from "./blob-storage.js";
import { getStorageProvider } from "./storage-provider.js";
import { readSupabaseAccount, writeSupabaseAccount } from "./supabase/cms-storage.js";

const scryptAsync = promisify(scrypt);

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const BLOB_PATH = "cms/account.json";
const REPO_PATH = join(process.cwd(), "data", "cms", "account.json");

function defaultUsername() {
  return process.env.CMS_USER?.trim() || "";
}

function defaultPassword() {
  return process.env.CMS_PASSWORD || "";
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

async function readFromBlob() {
  if (!hasBlobStorage()) return null;
  try {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 5, ...getBlobClientOptions() });
    const match = blobs.find((blob) => blob.pathname === BLOB_PATH);
    if (!match) return null;
    const res = await fetch(match.url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function readFromRepo() {
  try {
    const raw = await readFile(REPO_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function seedAccount() {
  const username = defaultUsername();
  if (!username) return null;
  return {
    username,
    passwordHash: null,
    email: process.env.CMS_EMAIL || "",
  };
}

export async function readAccount() {
  if (getStorageProvider() === "supabase") {
    const fromSupabase = await readSupabaseAccount();
    if (fromSupabase) return fromSupabase;
  }

  let account = await readFromBlob();
  if (!account) account = await readFromRepo();
  if (!account) account = await seedAccount();
  if (!account) {
    throw Object.assign(new Error("CMS não configurado. Defina CMS_USER e CMS_PASSWORD."), { status: 503 });
  }
  return account;
}

async function persistAccount(account) {
  if (getStorageProvider() === "supabase") {
    await writeSupabaseAccount(account);
    return;
  }

  const payload = JSON.stringify(account, null, 2) + "\n";

  if (hasBlobStorage()) {
    await writeBlob(BLOB_PATH, payload);
    return;
  }

  try {
    await mkdir(dirname(REPO_PATH), { recursive: true });
    await writeFile(REPO_PATH, payload, "utf8");
  } catch (err) {
    throw Object.assign(
      new Error("Armazenamento indisponível. Configure Supabase ou Vercel Blob para salvar alterações de conta."),
      { status: 503 },
    );
  }
}

function normalizeLogin(value) {
  return String(value ?? "").trim();
}

function matchesAccountIdentity(input, account) {
  const value = normalizeLogin(input);
  if (!value || !account?.username) return false;
  if (safeEqual(value, account.username)) return true;

  const email = normalizeLogin(account.email);
  if (email && value.toLowerCase() === email.toLowerCase()) return true;

  return false;
}

export async function verifyAccountLogin(username, password) {
  const account = await readAccount();

  if (!account.username) {
    return false;
  }

  if (!matchesAccountIdentity(username, account)) {
    return false;
  }

  if (account.passwordHash) {
    return verifyPassword(password, account.passwordHash);
  }

  const fallbackPassword = defaultPassword();
  if (!fallbackPassword) return false;
  return safeEqual(password, fallbackPassword);
}

export async function getAccountProfile(username) {
  const account = await readAccount();
  if (!matchesAccountIdentity(username, account)) {
    throw Object.assign(new Error("Conta não encontrada"), { status: 404 });
  }
  return {
    user: account.username,
    email: account.email || "",
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function updateAccountProfile(username, { email, currentPassword, newPassword }) {
  const account = await readAccount();

  if (!matchesAccountIdentity(username, account)) {
    throw Object.assign(new Error("Conta não encontrada"), { status: 404 });
  }

  if (email !== undefined) {
    const trimmed = String(email).trim();
    if (trimmed && !isValidEmail(trimmed)) {
      throw Object.assign(new Error("E-mail inválido"), { status: 400 });
    }
    account.email = trimmed;
  }

  if (newPassword !== undefined) {
    const next = String(newPassword);
    if (next.length < 8) {
      throw Object.assign(new Error("A nova senha deve ter pelo menos 8 caracteres"), { status: 400 });
    }

    const current = String(currentPassword || "");
    const validCurrent = account.passwordHash
      ? await verifyPassword(current, account.passwordHash)
      : safeEqual(current, defaultPassword());

    if (!validCurrent) {
      throw Object.assign(new Error("Senha atual incorreta"), { status: 401 });
    }

    account.passwordHash = await hashPassword(next);
  }

  await persistAccount(account);
  return getAccountProfile(username);
}
