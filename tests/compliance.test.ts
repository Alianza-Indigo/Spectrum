import { describe, it, expect } from "vitest";
import { screenText, shouldBlock } from "@/lib/compliance";

describe("Screening de cumplimiento", () => {
  it("marca solicitudes de acceso no autorizado", () => {
    const flags = screenText("Necesito hackear la cuenta de correo de un empleado");
    expect(flags.some((f) => f.category === "unauthorized_access")).toBe(true);
    expect(shouldBlock("quiero hackear un WhatsApp")).toBe(true);
  });

  it("detecta interceptación y malware", () => {
    expect(shouldBlock("pueden interceptar sus llamadas")).toBe(true);
    expect(shouldBlock("instalar un keylogger en su laptop")).toBe(true);
  });

  it("detecta reconocimiento facial", () => {
    const flags = screenText("Identificar por la cara a esta persona en una foto");
    expect(flags.some((f) => f.category === "facial_recognition")).toBe(true);
  });

  it("es robusto ante acentos y mayúsculas", () => {
    expect(shouldBlock("ESPIAR a mi socio")).toBe(true);
    expect(shouldBlock("suplantar la identidad")).toBe(true);
  });

  it("no marca solicitudes legítimas", () => {
    expect(shouldBlock("Requerimos una debida diligencia societaria de un proveedor")).toBe(false);
    expect(screenText("Verificación de antecedentes con fuentes públicas autorizadas")).toHaveLength(0);
  });
});
