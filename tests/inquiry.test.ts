import { describe, it, expect } from "vitest";
import { inquirySchema } from "@/lib/validation/inquiry";

const valid = {
  name: "Ana Pérez",
  email: "ana@example.com",
  serviceType: "due_diligence",
  summary: "Requerimos verificar la existencia legal de un proveedor.",
  urgency: "NORMAL",
  authorizationConfirmed: true,
  contactConsent: true,
};

describe("Esquema de solicitud pública", () => {
  it("acepta una solicitud válida", () => {
    expect(inquirySchema.safeParse(valid).success).toBe(true);
  });

  it("exige confirmación de autorización y consentimiento", () => {
    const r = inquirySchema.safeParse({ ...valid, authorizationConfirmed: false });
    expect(r.success).toBe(false);
  });

  it("rechaza correos no válidos", () => {
    expect(inquirySchema.safeParse({ ...valid, email: "no-es-correo" }).success).toBe(false);
  });

  it("exige una descripción mínima", () => {
    expect(inquirySchema.safeParse({ ...valid, summary: "corto" }).success).toBe(false);
  });

  it("rechaza un tipo de servicio desconocido", () => {
    expect(inquirySchema.safeParse({ ...valid, serviceType: "cualquier" }).success).toBe(false);
  });
});
