import { z } from "zod";

/**
 * Esquema del formulario público de solicitud de evaluación confidencial.
 * No se solicita información altamente sensible ni documentos completos:
 * la agencia decide después el canal seguro (art. 6.3 del PRD).
 */
export const serviceTypes = [
  "corporate",
  "due_diligence",
  "background_check",
  "asset_investigation",
  "person_location",
  "fraud_internal",
  "competitive_intelligence",
  "document_analysis",
  "reputational_risk",
  "legal_support",
  "other",
] as const;

export const inquirySchema = z.object({
  name: z.string().trim().min(2, "Indica tu nombre.").max(120),
  organizationName: z.string().trim().max(160).optional().or(z.literal("")),
  email: z.string().trim().email("Correo no válido.").max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  serviceType: z.enum(serviceTypes, { message: "Selecciona un tipo de servicio." }),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  region: z.string().trim().max(80).optional().or(z.literal("")),
  summary: z
    .string()
    .trim()
    .min(20, "Describe el asunto con al menos 20 caracteres.")
    .max(2000, "Máximo 2000 caracteres."),
  urgency: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).default("NORMAL"),
  relationship: z.string().trim().max(200).optional().or(z.literal("")),
  authorizationConfirmed: z.literal(true, {
    message: "Debes confirmar que cuentas con autorización para proporcionar la información.",
  }),
  contactConsent: z.literal(true, {
    message: "Necesitamos tu consentimiento para contactarte.",
  }),
  // Honeypot anti-spam: debe venir vacío.
  website: z.string().max(0).optional(),
});

export type InquiryInput = z.infer<typeof inquirySchema>;

export const serviceTypeLabels: Record<(typeof serviceTypes)[number], string> = {
  corporate: "Investigaciones corporativas",
  due_diligence: "Debida diligencia",
  background_check: "Verificación de antecedentes",
  asset_investigation: "Investigación patrimonial y empresarial",
  person_location: "Localización de personas conforme a la ley",
  fraud_internal: "Fraudes y conflictos internos",
  competitive_intelligence: "Inteligencia competitiva ética",
  document_analysis: "Análisis documental y de expedientes",
  reputational_risk: "Riesgos reputacionales",
  legal_support: "Apoyo documental para estrategias legales",
  other: "Otro asunto",
};
