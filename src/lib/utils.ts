import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases de Tailwind resolviendo conflictos. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Hash SHA-256 hex de una cadena (para IP, tokens de auditoría, etc.). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input) as BufferSource;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
