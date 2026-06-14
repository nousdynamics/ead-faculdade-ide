import { createHmac, timingSafeEqual } from "node:crypto";
import { getBearerToken } from "./http.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function getSecret() {
  return process.env.CMS_SECRET || process.env.CMS_PASSWORD || "change-me-in-production";
}

export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyCredentials(username, password) {
  const expectedUser = process.env.CMS_USER || "yeaslest";
  const expectedPass = process.env.CMS_PASSWORD || "lest1234567";
  return safeEqual(username, expectedUser) && safeEqual(password, expectedPass);
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createToken(user) {
  const payload = encodeBase64Url(JSON.stringify({
    user,
    exp: Date.now() + SESSION_TTL_MS,
  }));
  const signature = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyToken(token) {
  if (!token || !token.includes(".")) return null;

  const [payload, signature] = token.split(".");
  const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const data = JSON.parse(decodeBase64Url(payload));
    if (!data.user || !data.exp || data.exp < Date.now()) return null;
    return { user: data.user };
  } catch {
    return null;
  }
}

export function requireAuth(req, res, jsonResponse) {
  const session = verifyToken(getBearerToken(req));
  if (!session) {
    jsonResponse(res, 401, { error: "Não autorizado" });
    return null;
  }
  return session;
}
