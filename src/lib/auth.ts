import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { AuthUser, UserRole } from "@/types/adisyon";

export const SESSION_COOKIE_NAME = "show_bufe_session";

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || "show-bufe-local-auth-secret-2026";
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = crypto.scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

interface SessionPayload extends AuthUser {
  exp: number;
}

export function normalizeRole(raw: unknown): UserRole {
  const upper = String(raw ?? "").trim().toUpperCase();
  if (upper === "ADMIN" || upper === "MUTFAK" || upper === "SIPARIS") {
    return upper;
  }
  return "SIPARIS";
}

export function createSessionToken(user: AuthUser): string {
  const payload: SessionPayload = {
    ...user,
    role: normalizeRole(user.role),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 gün
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf-8").toString(
    "base64url"
  );
  const sig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export function parseSessionToken(token: string | undefined): AuthUser | null {
  if (!token) return null;
  const dotIdx = token.indexOf(".");
  if (dotIdx <= 0) return null;

  const encoded = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(encoded)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf-8")
    ) as SessionPayload;
    if (!parsed.username || !parsed.role || Date.now() > parsed.exp) {
      return null;
    }
    return {
      username: parsed.username,
      displayName: parsed.displayName,
      role: normalizeRole(parsed.role),
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return parseSessionToken(token);
}

export function getDefaultRouteForRole(role: UserRole): string {
  const normalized = normalizeRole(role);
  if (normalized === "ADMIN") return "/admin";
  if (normalized === "MUTFAK") return "/mutfak";
  return "/";
}
