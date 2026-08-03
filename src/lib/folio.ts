import { customAlphabet } from "nanoid";

/**
 * Folio legible, único y NO predecible.
 * Formato: SPX-XXXXXXXX  (8 caracteres de un alfabeto sin ambigüedades).
 *
 * Se evita el año secuencial predecible; la aleatoriedad reduce el riesgo de
 * enumeración (IDOR). La unicidad se refuerza con la restricción UNIQUE en BD.
 */
const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin I, L, O, 0, 1
const nano = customAlphabet(alphabet, 8);

export function generateFolio(prefix = "SPX"): string {
  return `${prefix}-${nano()}`;
}
