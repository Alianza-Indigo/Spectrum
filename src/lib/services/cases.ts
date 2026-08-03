import type { CaseStatus, CaseType, ConfidentialityLevel, RiskLevel, ViabilityDecision } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateFolio } from "@/lib/folio";
import { canTransition } from "@/lib/status";
import { recordAudit } from "@/lib/audit";
import { screenText } from "@/lib/compliance";
import { AccessError, requireCaseAccess, orgScope } from "@/lib/auth/guards";
import type { SessionPayload } from "@/lib/auth/session";

export type CreateCaseInput = {
  internalName: string;
  clientId?: string | null;
  type: CaseType;
  description?: string;
  objective?: string;
  scope?: string;
  exclusions?: string;
  jurisdiction?: string;
  confidentiality?: ConfidentialityLevel;
  operationalRisk?: RiskLevel;
  legalRisk?: RiskLevel;
  leadUserId?: string | null;
  dueAt?: Date | null;
};

export async function createCase(session: SessionPayload, input: CreateCaseInput) {
  const orgId = session.organizationId;
  if (!orgId) throw new AccessError(400, "Sesión sin organización.");

  // Folio único no predecible (reintento defensivo ante colisión improbable).
  let folio = generateFolio();
  for (let i = 0; i < 3; i++) {
    const exists = await prisma.case.findUnique({ where: { folio } });
    if (!exists) break;
    folio = generateFolio();
  }

  const created = await prisma.case.create({
    data: {
      organizationId: orgId,
      folio,
      internalName: input.internalName,
      clientId: input.clientId ?? null,
      type: input.type,
      description: input.description ?? null,
      objective: input.objective ?? null,
      scope: input.scope ?? null,
      exclusions: input.exclusions ?? null,
      jurisdiction: input.jurisdiction ?? null,
      confidentiality: input.confidentiality ?? "SENSITIVE",
      operationalRisk: input.operationalRisk ?? "MEDIUM",
      legalRisk: input.legalRisk ?? "MEDIUM",
      leadUserId: input.leadUserId ?? null,
      dueAt: input.dueAt ?? null,
      status: "SOLICITUD_RECIBIDA",
    },
  });

  // El responsable queda asignado automáticamente.
  if (input.leadUserId) {
    await prisma.caseAssignment.create({
      data: { caseId: created.id, userId: input.leadUserId, role: "DIRECTOR" },
    }).catch(() => undefined);
  }

  await recordAudit({
    organizationId: orgId,
    actorUserId: session.userId,
    action: "case.create",
    resourceType: "case",
    resourceId: created.id,
    metadata: { folio: created.folio, type: created.type },
  });

  return created;
}

/** Requisitos para abrir un expediente (art. 9 del PRD). */
export async function openRequirements(caseId: string): Promise<string[]> {
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  if (!c) return ["El expediente no existe."];
  const missing: string[] = [];
  if (!c.clientId) missing.push("Cliente identificado");
  if (!c.scope || c.scope.trim().length < 3) missing.push("Alcance definido");
  if (!c.leadUserId) missing.push("Responsable asignado");
  const auth = await prisma.caseAuthorization.count({ where: { caseId } });
  if (auth === 0) missing.push("Autorización registrada");
  return missing;
}

export async function transitionCase(session: SessionPayload, caseId: string, to: CaseStatus) {
  const current = await requireCaseAccess(session, caseId);

  if (!canTransition(current.status, to)) {
    throw new AccessError(422, `Transición no permitida: ${current.status} → ${to}.`);
  }

  if (to === "ABIERTO") {
    const missing = await openRequirements(caseId);
    if (missing.length > 0) {
      throw new AccessError(422, `No puede abrirse el expediente. Falta: ${missing.join(", ")}.`);
    }
  }

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      status: to,
      openedAt: to === "ABIERTO" && !current.openedAt ? new Date() : current.openedAt,
      closedAt: to === "CERRADO" ? new Date() : current.closedAt,
    },
  });

  await prisma.activity.create({
    data: {
      organizationId: updated.organizationId,
      caseId,
      authorUserId: session.userId,
      kind: "cambio_estado",
      content: `Estado: ${current.status} → ${to}`,
    },
  });

  await recordAudit({
    organizationId: updated.organizationId,
    actorUserId: session.userId,
    action: "case.transition",
    resourceType: "case",
    resourceId: caseId,
    metadata: { from: current.status, to },
  });

  return updated;
}

export type ViabilityInput = {
  requestedObjective: string;
  legitimateBasis?: string;
  risksToThirdParties?: string;
  conflictsOfInterest?: string;
  jurisdiction?: string;
  plannedSources?: string;
  prohibitedSources?: string;
  requiresLegalAdvice?: boolean;
  decision: ViabilityDecision;
  decisionReason?: string;
};

export async function recordViability(session: SessionPayload, caseId: string, input: ViabilityInput) {
  const current = await requireCaseAccess(session, caseId);

  // Screening de métodos prohibidos sobre el objetivo y las fuentes previstas.
  const flags = screenText(`${input.requestedObjective} ${input.plannedSources ?? ""}`);
  const forcedEscalation = flags.length > 0 && input.decision === "ACCEPT";

  const review = await prisma.viabilityReview.create({
    data: {
      caseId,
      requestedObjective: input.requestedObjective,
      legitimateBasis: input.legitimateBasis ?? null,
      risksToThirdParties: input.risksToThirdParties ?? null,
      conflictsOfInterest: input.conflictsOfInterest ?? null,
      jurisdiction: input.jurisdiction ?? null,
      plannedSources: input.plannedSources ?? null,
      prohibitedSources: input.prohibitedSources ?? null,
      requiresLegalAdvice: input.requiresLegalAdvice ?? flags.length > 0,
      decision: forcedEscalation ? "ESCALATE" : input.decision,
      decisionReason: forcedEscalation
        ? `Escalado automáticamente: se detectaron posibles métodos prohibidos (${flags.map((f) => f.category).join(", ")}). ${input.decisionReason ?? ""}`.trim()
        : input.decisionReason ?? null,
      decidedByUser: session.userId,
    },
  });

  // Reflejar la decisión en el estado del expediente cuando aplique.
  const nextStatus: Record<ViabilityDecision, CaseStatus | null> = {
    ACCEPT: "PENDIENTE_AUTORIZACION",
    REJECT: "RECHAZADO",
    REQUEST_CLARIFICATION: "EN_EVALUACION",
    ESCALATE: "CONFLICTO_DETECTADO",
  };
  const decision = forcedEscalation ? "ESCALATE" : input.decision;
  const target = nextStatus[decision];
  if (target && canTransition(current.status, target)) {
    await prisma.case.update({ where: { id: caseId }, data: { status: target } });
  }

  await recordAudit({
    organizationId: current.organizationId,
    actorUserId: session.userId,
    action: "case.viability",
    resourceType: "case",
    resourceId: caseId,
    metadata: { decision, complianceFlags: flags.map((f) => f.category) },
  });

  return { review, complianceFlags: flags, escalated: forcedEscalation };
}

export type AuthorizationInput = {
  kind: string;
  description: string;
  grantedBy?: string;
  validFrom?: Date | null;
  validUntil?: Date | null;
};

export async function addAuthorization(session: SessionPayload, caseId: string, input: AuthorizationInput) {
  const current = await requireCaseAccess(session, caseId);
  const auth = await prisma.caseAuthorization.create({
    data: {
      caseId,
      kind: input.kind,
      description: input.description,
      grantedBy: input.grantedBy ?? null,
      validFrom: input.validFrom ?? null,
      validUntil: input.validUntil ?? null,
      recordedByUser: session.userId,
    },
  });
  await recordAudit({
    organizationId: current.organizationId,
    actorUserId: session.userId,
    action: "case.authorization.add",
    resourceType: "case",
    resourceId: caseId,
    metadata: { kind: input.kind },
  });
  return auth;
}

/** Asignación de investigadores/analistas a un expediente. */
export async function assignUser(session: SessionPayload, caseId: string, userId: string, role: "INVESTIGATOR" | "ANALYST" | "QUALITY_REVIEWER" | "DIRECTOR") {
  await requireCaseAccess(session, caseId);
  const assignment = await prisma.caseAssignment.upsert({
    where: { caseId_userId_role: { caseId, userId, role } },
    update: {},
    create: { caseId, userId, role },
  });
  await recordAudit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: "case.assign",
    resourceType: "case",
    resourceId: caseId,
    metadata: { userId, role },
  });
  return assignment;
}

export async function listCasesForClient(session: SessionPayload, clientId: string) {
  return prisma.case.findMany({ where: { ...orgScope(session), clientId }, orderBy: { createdAt: "desc" } });
}
