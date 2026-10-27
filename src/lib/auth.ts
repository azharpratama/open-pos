import { NextResponse } from "next/server";
import crypto from "crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

export interface SessionUser {
  id: string;
  email: string;
  role: "OWNER" | "KASIR";
  name: string;
}

export const SESSION_COOKIE_NAME = "openpos_session";
const SESSION_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecretKey(): string {
  return (
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "openpos-default-production-secret-key-32-chars-long"
  );
}

// ─────────────────────────────────────────────────────────────
// Better Auth Server Instance
// Configured with Drizzle ORM Adapter & PostgreSQL
// ─────────────────────────────────────────────────────────────

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      users: schema.users,
      sessions: schema.sessions,
      accounts: schema.accounts,
      verifications: schema.verifications,
    },
    usePlural: true,
  }),
  secret: getSecretKey(),
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "karyawan",
        required: true,
        input: false,
      },
    },
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
});

export type Session = typeof auth.$Infer.Session;

// ─────────────────────────────────────────────────────────────
// JWT Token creation & verification via Web Crypto API
// Compatible with both Node.js runtime and Next.js Edge/Middleware
// ─────────────────────────────────────────────────────────────

async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecretKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const enc = new TextEncoder();
  const key = await getCryptoKey();
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SECONDS;
  const payload = base64UrlEncode(JSON.stringify({ ...user, exp }));
  const data = enc.encode(`${header}.${payload}`);

  const sig = await crypto.subtle.sign("HMAC", key, data);
  const sigB64 = Buffer.from(sig)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${header}.${payload}.${sigB64}`;
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, sigB64] = parts;

    const enc = new TextEncoder();
    const key = await getCryptoKey();
    const data = enc.encode(`${header}.${payload}`);

    let base64Sig = sigB64.replace(/-/g, "+").replace(/_/g, "/");
    while (base64Sig.length % 4) base64Sig += "=";
    const sigBytes = Buffer.from(base64Sig, "base64");

    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, data);
    if (!valid) return null;

    const decoded = JSON.parse(base64UrlDecode(payload));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Cookie Management
// ─────────────────────────────────────────────────────────────

export async function setSessionCookie(
  response: NextResponse,
  user: SessionUser
): Promise<void> {
  const token = await createSessionToken(user);
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRY_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// ─────────────────────────────────────────────────────────────
// Password Hashing & Verification (PBKDF2 SHA-512)
// ─────────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (!storedHash.includes(":")) {
    return password === storedHash;
  }
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
}

// Compatibility stub for tests
export function createClient() {
  return {
    auth: {
      async signInWithPassword(_credentials?: any): Promise<any> {
        return { data: { user: null }, error: null };
      },
      async signOut(_options?: any): Promise<any> {
        return { error: null };
      },
      async getUser(): Promise<any> {
        return { data: { user: null }, error: null };
      },
      async getSession(): Promise<any> {
        return { data: { session: null }, error: null };
      },
    },
  };
}
