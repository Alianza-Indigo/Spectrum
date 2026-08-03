import type { Role } from "@/lib/auth/rbac";

/**
 * Sesiones firmadas con HMAC-SHA256 usando Web Crypto (compatible con Node y
 * Edge/middleware). El token es `payloadB64.signatureB64` y viaja en una cookie
 * httpOnly. No sustituye a un IdP completo, pero ofrece sesiones seguras y
 * verificables para la consola.
 */
export const SESSION_COOKIE = "spx_session";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 horas

export type SessionPayload = {
  userId: string;
  organizationId: string | null;
  name: string;
  email: string;
  roles: Role[];
  exp: number; // epoch segundos
};

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (str.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET no está configurado.");
  return s;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const key = await importKey(secret());
  const data = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data) as BufferSource);
  return `${data}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  try {
    const key = await importKey(secret());
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sig) as BufferSource,
      new TextEncoder().encode(data) as BufferSource,
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(data))) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
