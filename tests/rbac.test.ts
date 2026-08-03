import { describe, it, expect } from "vitest";
import { can, canAny, caseVisibility } from "@/lib/auth/rbac";

describe("RBAC", () => {
  it("el administrador tiene todos los permisos", () => {
    expect(can("ADMIN", "org:manage")).toBe(true);
    expect(can("ADMIN", "audit:read")).toBe(true);
    expect(can("ADMIN", "evidence:upload")).toBe(true);
  });

  it("el investigador solo ve expedientes asignados", () => {
    expect(caseVisibility(["INVESTIGATOR"])).toBe("assigned");
    expect(can("INVESTIGATOR", "case:read_assigned")).toBe(true);
    expect(can("INVESTIGATOR", "case:read")).toBe(false);
  });

  it("dirección y calidad tienen visibilidad de organización", () => {
    expect(caseVisibility(["DIRECTOR"])).toBe("all");
    expect(caseVisibility(["QUALITY_REVIEWER"])).toBe("all");
  });

  it("el cliente no puede gestionar la organización ni ver auditoría", () => {
    expect(can("CLIENT", "org:manage")).toBe(false);
    expect(can("CLIENT", "audit:read")).toBe(false);
    expect(can("CLIENT", "portal:read")).toBe(true);
  });

  it("el revisor de calidad puede revisar informes pero no gestionar entregas", () => {
    expect(can("QUALITY_REVIEWER", "report:review")).toBe(true);
    expect(can("QUALITY_REVIEWER", "delivery:manage")).toBe(false);
  });

  it("canAny agrega permisos de varios roles", () => {
    expect(canAny(["INVESTIGATOR", "QUALITY_REVIEWER"], "report:review")).toBe(true);
    expect(canAny(["INVESTIGATOR"], "report:review")).toBe(false);
  });

  it("el auditor externo es de solo lectura", () => {
    expect(can("EXTERNAL_AUDITOR", "audit:read")).toBe(true);
    expect(can("EXTERNAL_AUDITOR", "case:update")).toBe(false);
    expect(can("EXTERNAL_AUDITOR", "evidence:upload")).toBe(false);
  });
});
