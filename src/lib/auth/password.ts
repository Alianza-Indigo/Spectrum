import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Hashing de contraseñas con scrypt (biblioteca estándar de Node, sin
 * dependencias nativas externas). Formato almacenado:
 *   scrypt$<saltHex>$<hashHex>
 *
 * Nota: se ejecuta únicamente en el runtime Node (no en Edge).
 */
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const derived = scryptSync(password, salt, KEYLEN);
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
