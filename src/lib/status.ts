import type {
  CaseStatus, TaskStatus, ReviewStatus, EvidenceStatus, InquiryStatus,
  DeliveryStatus, ConfidenceLevel, Reliability, ConfidentialityLevel, RiskLevel,
  ViabilityDecision, PaymentStatus,
} from "@prisma/client";

type Tone = "neutral" | "indigo" | "cyan" | "violet" | "success" | "warning" | "danger";

export const caseStatusLabels: Record<CaseStatus, string> = {
  SOLICITUD_RECIBIDA: "Solicitud recibida",
  EN_EVALUACION: "En evaluación",
  RECHAZADO: "Rechazado",
  CONFLICTO_DETECTADO: "Conflicto detectado",
  PENDIENTE_AUTORIZACION: "Pendiente de autorización",
  CONTRATADO: "Contratado",
  ABIERTO: "Abierto",
  EN_INVESTIGACION: "En investigación",
  EN_REVISION: "En revisión",
  PENDIENTE_CLIENTE: "Pendiente del cliente",
  INFORME_LISTO: "Informe listo",
  ENTREGADO: "Entregado",
  PAUSADO: "Pausado",
  CERRADO: "Cerrado",
  RETENIDO: "Retenido",
  ELIMINADO: "Eliminado",
};

export const caseStatusTone: Record<CaseStatus, Tone> = {
  SOLICITUD_RECIBIDA: "neutral",
  EN_EVALUACION: "cyan",
  RECHAZADO: "danger",
  CONFLICTO_DETECTADO: "danger",
  PENDIENTE_AUTORIZACION: "warning",
  CONTRATADO: "indigo",
  ABIERTO: "indigo",
  EN_INVESTIGACION: "violet",
  EN_REVISION: "cyan",
  PENDIENTE_CLIENTE: "warning",
  INFORME_LISTO: "success",
  ENTREGADO: "success",
  PAUSADO: "warning",
  CERRADO: "neutral",
  RETENIDO: "neutral",
  ELIMINADO: "danger",
};

/**
 * Máquina de estados del expediente. Define transiciones permitidas. La
 * transición a ABIERTO exige requisitos verificados en la capa de servicio
 * (cliente, alcance, responsable y autorización).
 */
export const caseTransitions: Record<CaseStatus, CaseStatus[]> = {
  SOLICITUD_RECIBIDA: ["EN_EVALUACION", "RECHAZADO"],
  EN_EVALUACION: ["CONFLICTO_DETECTADO", "PENDIENTE_AUTORIZACION", "RECHAZADO", "CONTRATADO"],
  CONFLICTO_DETECTADO: ["RECHAZADO", "PENDIENTE_AUTORIZACION", "EN_EVALUACION"],
  PENDIENTE_AUTORIZACION: ["CONTRATADO", "RECHAZADO", "EN_EVALUACION"],
  CONTRATADO: ["ABIERTO", "RECHAZADO"],
  ABIERTO: ["EN_INVESTIGACION", "PAUSADO", "CERRADO"],
  EN_INVESTIGACION: ["EN_REVISION", "PENDIENTE_CLIENTE", "PAUSADO"],
  EN_REVISION: ["INFORME_LISTO", "EN_INVESTIGACION", "PENDIENTE_CLIENTE"],
  PENDIENTE_CLIENTE: ["EN_INVESTIGACION", "EN_REVISION", "PAUSADO"],
  INFORME_LISTO: ["ENTREGADO", "EN_REVISION"],
  ENTREGADO: ["CERRADO", "EN_INVESTIGACION"],
  PAUSADO: ["EN_INVESTIGACION", "ABIERTO", "CERRADO"],
  CERRADO: ["RETENIDO"],
  RETENIDO: ["ELIMINADO", "CERRADO"],
  RECHAZADO: [],
  ELIMINADO: [],
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return caseTransitions[from]?.includes(to) ?? false;
}

export const taskStatusLabels: Record<TaskStatus, string> = {
  PENDIENTE: "Pendiente",
  ASIGNADA: "Asignada",
  EN_PROGRESO: "En progreso",
  BLOQUEADA: "Bloqueada",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
  EN_REVISION: "En revisión",
};

export const taskStatusTone: Record<TaskStatus, Tone> = {
  PENDIENTE: "neutral",
  ASIGNADA: "indigo",
  EN_PROGRESO: "violet",
  BLOQUEADA: "danger",
  COMPLETADA: "success",
  CANCELADA: "neutral",
  EN_REVISION: "cyan",
};

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En revisión",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  NEEDS_CHANGES: "Requiere cambios",
};

export const reviewStatusTone: Record<ReviewStatus, Tone> = {
  DRAFT: "neutral",
  IN_REVIEW: "cyan",
  APPROVED: "success",
  REJECTED: "danger",
  NEEDS_CHANGES: "warning",
};

export const evidenceStatusLabels: Record<EvidenceStatus, string> = {
  RECEIVED: "Recibido",
  VERIFIED: "Verificado",
  QUESTIONED: "Cuestionado",
  EXCLUDED: "Excluido",
  ANNEXED: "Anexado",
};

export const evidenceStatusTone: Record<EvidenceStatus, Tone> = {
  RECEIVED: "neutral",
  VERIFIED: "success",
  QUESTIONED: "warning",
  EXCLUDED: "danger",
  ANNEXED: "indigo",
};

export const inquiryStatusLabels: Record<InquiryStatus, string> = {
  RECEIVED: "Recibida",
  IN_TRIAGE: "En triage",
  CONTACTED: "Contactada",
  QUALIFIED: "Calificada",
  CONVERTED: "Convertida",
  DECLINED: "Declinada",
  ARCHIVED: "Archivada",
};

export const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  PREPARED: "Preparada",
  SENT: "Enviada",
  VIEWED: "Vista",
  DOWNLOADED: "Descargada",
  ACKNOWLEDGED: "Confirmada",
  REVOKED: "Revocada",
  EXPIRED: "Expirada",
};

export const deliveryStatusTone: Record<DeliveryStatus, Tone> = {
  PREPARED: "neutral",
  SENT: "cyan",
  VIEWED: "indigo",
  DOWNLOADED: "violet",
  ACKNOWLEDGED: "success",
  REVOKED: "danger",
  EXPIRED: "warning",
};

export const confidenceLabels: Record<ConfidenceLevel, string> = {
  SPECULATIVE: "Especulativo",
  LOW: "Bajo",
  MODERATE: "Moderado",
  HIGH: "Alto",
  CORROBORATED: "Corroborado",
};

export const reliabilityLabels: Record<Reliability, string> = {
  UNKNOWN: "Desconocida",
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  VERIFIED: "Verificada",
};

export const confidentialityLabels: Record<ConfidentialityLevel, string> = {
  STANDARD: "Estándar",
  SENSITIVE: "Sensible",
  RESTRICTED: "Restringido",
  CRITICAL: "Crítico",
};

export const riskLabels: Record<RiskLevel, string> = {
  LOW: "Bajo",
  MEDIUM: "Medio",
  HIGH: "Alto",
  CRITICAL: "Crítico",
};

export const viabilityDecisionLabels: Record<ViabilityDecision, string> = {
  ACCEPT: "Aceptar",
  REJECT: "Rechazar",
  REQUEST_CLARIFICATION: "Solicitar aclaración",
  ESCALATE: "Escalar",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  PARTIAL: "Parcial",
  PAID: "Pagado",
  OVERDUE: "Vencido",
  WAIVED: "Condonado",
};
