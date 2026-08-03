import { describe, it, expect } from "vitest";
import { generateFolio } from "@/lib/folio";

describe("Generación de folio", () => {
  it("tiene el formato SPX-XXXXXXXX sin caracteres ambiguos", () => {
    const folio = generateFolio();
    expect(folio).toMatch(/^SPX-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
  });

  it("es razonablemente único (no predecible)", () => {
    const set = new Set(Array.from({ length: 5000 }, () => generateFolio()));
    expect(set.size).toBe(5000);
  });

  it("respeta un prefijo personalizado", () => {
    expect(generateFolio("CASE")).toMatch(/^CASE-/);
  });
});
