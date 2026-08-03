import { describe, it, expect } from "vitest";
import { canTransition, caseTransitions } from "@/lib/status";

describe("Máquina de estados del expediente", () => {
  it("permite la ruta esperada de apertura", () => {
    expect(canTransition("CONTRATADO", "ABIERTO")).toBe(true);
    expect(canTransition("ABIERTO", "EN_INVESTIGACION")).toBe(true);
    expect(canTransition("EN_INVESTIGACION", "EN_REVISION")).toBe(true);
    expect(canTransition("INFORME_LISTO", "ENTREGADO")).toBe(true);
    expect(canTransition("ENTREGADO", "CERRADO")).toBe(true);
  });

  it("no permite saltos inválidos", () => {
    expect(canTransition("SOLICITUD_RECIBIDA", "ABIERTO")).toBe(false);
    expect(canTransition("SOLICITUD_RECIBIDA", "ENTREGADO")).toBe(false);
    expect(canTransition("ABIERTO", "ENTREGADO")).toBe(false);
  });

  it("los estados terminales no tienen transiciones", () => {
    expect(caseTransitions.RECHAZADO).toHaveLength(0);
    expect(caseTransitions.ELIMINADO).toHaveLength(0);
  });

  it("retenido puede eliminarse tras el cierre", () => {
    expect(canTransition("CERRADO", "RETENIDO")).toBe(true);
    expect(canTransition("RETENIDO", "ELIMINADO")).toBe(true);
  });
});
