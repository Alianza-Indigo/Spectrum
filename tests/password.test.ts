import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("Hashing de contraseñas", () => {
  it("verifica una contraseña correcta", () => {
    const stored = hashPassword("Sup3r-Secreto!");
    expect(verifyPassword("Sup3r-Secreto!", stored)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", () => {
    const stored = hashPassword("Sup3r-Secreto!");
    expect(verifyPassword("otra", stored)).toBe(false);
  });

  it("usa sal distinta en cada hash", () => {
    expect(hashPassword("igual")).not.toBe(hashPassword("igual"));
  });

  it("rechaza formatos no válidos o vacíos", () => {
    expect(verifyPassword("x", null)).toBe(false);
    expect(verifyPassword("x", "formato-malo")).toBe(false);
  });
});
