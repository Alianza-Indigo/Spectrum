"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  CaseType, CaseStatus, ViabilityDecision, TaskStatus, TaskPriority, SourceType,
  Reliability, ConfidenceLevel, EvidenceType, EvidenceStatus, TimelinePrecision,
  TimelineKind, ReportType, ReviewStatus, AiReviewStatus, PaymentStatus, Role,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { pageGuard, requireCaseAccess, AccessError } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import {
  createCase, transitionCase, recordViability, addAuthorization, assignUser,
} from "@/lib/services/cases";
import { ingestEvidence, setEvidenceStatus, getEvidenceDownloadUrl } from "@/lib/services/evidence";
import { createFinding } from "@/lib/services/findings";
import { runCaseAi, reviewAiOutput } from "@/lib/services/ai";
import { createReport, generateReportPdf, setReportStatus } from "@/lib/services/reports";
import { createDelivery, createAccessLink, revokeDelivery } from "@/lib/services/delivery";
import type { AiOperation } from "@/lib/adapters/ai";

function rev(caseId: string) {
  revalidatePath(`/consola/panel/expedientes/${caseId}`, "layout");
}

/** Ejecuta una operación y, si es un error de negocio conocido, vuelve con aviso. */
async function guarded(caseId: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    if (e instanceof AccessError) {
      redirect(`/consola/panel/expedientes/${caseId}?msg=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }
}

// --- Alta de expediente ------------------------------------------------------
const createSchema = z.object({
  internalName: z.string().trim().min(3).max(200),
  type: z.nativeEnum(CaseType),
  clientId: z.string().uuid().optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional(),
  objective: z.string().trim().max(2000).optional(),
  scope: z.string().trim().max(2000).optional(),
  exclusions: z.string().trim().max(2000).optional(),
  jurisdiction: z.string().trim().max(120).optional(),
  leadUserId: z.string().uuid().optional().or(z.literal("")),
});

export async function createCaseAction(formData: FormData) {
  const session = await pageGuard("case:create");
  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/consola/panel/expedientes/nuevo?error=1");

  const d = parsed.data;
  const created = await createCase(session, {
    internalName: d.internalName,
    type: d.type,
    clientId: d.clientId || null,
    description: d.description,
    objective: d.objective,
    scope: d.scope,
    exclusions: d.exclusions,
    jurisdiction: d.jurisdiction,
    leadUserId: d.leadUserId || session.userId,
  });
  redirect(`/consola/panel/expedientes/${created.id}`);
}

// --- Transición de estado ----------------------------------------------------
export async function transitionCaseAction(formData: FormData) {
  const session = await pageGuard("case:update");
  const caseId = String(formData.get("caseId"));
  const to = formData.get("to") as CaseStatus;
  await guarded(caseId, async () => {
    await transitionCase(session, caseId, to);
  });
  rev(caseId);
}

// --- Viabilidad --------------------------------------------------------------
export async function recordViabilityAction(formData: FormData) {
  const session = await pageGuard("case:viability");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    await recordViability(session, caseId, {
      requestedObjective: String(formData.get("requestedObjective") ?? ""),
      legitimateBasis: String(formData.get("legitimateBasis") ?? "") || undefined,
      risksToThirdParties: String(formData.get("risksToThirdParties") ?? "") || undefined,
      conflictsOfInterest: String(formData.get("conflictsOfInterest") ?? "") || undefined,
      plannedSources: String(formData.get("plannedSources") ?? "") || undefined,
      prohibitedSources: String(formData.get("prohibitedSources") ?? "") || undefined,
      requiresLegalAdvice: formData.get("requiresLegalAdvice") === "on",
      decision: formData.get("decision") as ViabilityDecision,
      decisionReason: String(formData.get("decisionReason") ?? "") || undefined,
    });
  });
  rev(caseId);
}

// --- Autorización ------------------------------------------------------------
export async function addAuthorizationAction(formData: FormData) {
  const session = await pageGuard("case:authorize");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    await addAuthorization(session, caseId, {
      kind: String(formData.get("kind") ?? "consentimiento"),
      description: String(formData.get("description") ?? ""),
      grantedBy: String(formData.get("grantedBy") ?? "") || undefined,
    });
  });
  rev(caseId);
}

// --- Asignación --------------------------------------------------------------
export async function assignUserAction(formData: FormData) {
  const session = await pageGuard("case:update");
  const caseId = String(formData.get("caseId"));
  const userId = String(formData.get("userId"));
  const role = formData.get("role") as Role;
  await guarded(caseId, async () => {
    if (["INVESTIGATOR", "ANALYST", "QUALITY_REVIEWER", "DIRECTOR"].includes(role)) {
      await assignUser(session, caseId, userId, role as "INVESTIGATOR" | "ANALYST" | "QUALITY_REVIEWER" | "DIRECTOR");
    }
  });
  rev(caseId);
}

// --- Plan de investigación ---------------------------------------------------
export async function savePlanAction(formData: FormData) {
  const session = await pageGuard("case:update");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    await requireCaseAccess(session, caseId);
    const data = {
      scope: String(formData.get("scope") ?? "") || null,
      limits: String(formData.get("limits") ?? "") || null,
      authorizedSources: String(formData.get("authorizedSources") ?? "") || null,
      allowedMethods: String(formData.get("allowedMethods") ?? "") || null,
      prohibitedMethods: String(formData.get("prohibitedMethods") ?? "") || null,
      sufficiencyCriteria: String(formData.get("sufficiencyCriteria") ?? "") || null,
      risksAndControls: String(formData.get("risksAndControls") ?? "") || null,
    };
    const existing = await prisma.investigationPlan.findFirst({ where: { caseId }, orderBy: { version: "desc" } });
    if (existing) {
      await prisma.investigationPlan.update({ where: { id: existing.id }, data });
    } else {
      await prisma.investigationPlan.create({ data: { caseId, version: 1, createdByUser: session.userId, ...data } });
    }
  });
  rev(caseId);
}

// --- Tareas ------------------------------------------------------------------
export async function addTaskAction(formData: FormData) {
  const session = await pageGuard("task:write");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    const c = await requireCaseAccess(session, caseId);
    await prisma.task.create({
      data: {
        organizationId: c.organizationId,
        caseId,
        title: String(formData.get("title") ?? "Tarea"),
        description: String(formData.get("description") ?? "") || null,
        assigneeUserId: String(formData.get("assigneeUserId") ?? "") || null,
        priority: (formData.get("priority") as TaskPriority) ?? "MEDIUM",
        authorizedMethod: String(formData.get("authorizedMethod") ?? "") || null,
        expectedEvidence: String(formData.get("expectedEvidence") ?? "") || null,
        status: "PENDIENTE",
      },
    });
  });
  rev(caseId);
}

export async function updateTaskStatusAction(formData: FormData) {
  const session = await pageGuard("task:write");
  const caseId = String(formData.get("caseId"));
  const taskId = String(formData.get("taskId"));
  await guarded(caseId, async () => {
    await requireCaseAccess(session, caseId);
    const task = await prisma.task.findFirst({ where: { id: taskId, caseId } });
    if (!task) return;
    await prisma.task.update({ where: { id: taskId }, data: { status: formData.get("status") as TaskStatus } });
  });
  rev(caseId);
}

export async function addTimeEntryAction(formData: FormData) {
  const session = await pageGuard("task:write");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    const c = await requireCaseAccess(session, caseId);
    await prisma.timeEntry.create({
      data: {
        organizationId: c.organizationId,
        caseId,
        taskId: String(formData.get("taskId") ?? "") || null,
        userId: session.userId,
        hours: String(formData.get("hours") ?? "0"),
        note: String(formData.get("note") ?? "") || null,
      },
    });
  });
  rev(caseId);
}

// --- Actividades (inmutables) ------------------------------------------------
export async function addActivityAction(formData: FormData) {
  const session = await pageGuard("activity:write");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    const c = await requireCaseAccess(session, caseId);
    await prisma.activity.create({
      data: {
        organizationId: c.organizationId,
        caseId,
        authorUserId: session.userId,
        kind: String(formData.get("kind") ?? "nota"),
        content: String(formData.get("content") ?? ""),
      },
    });
  });
  rev(caseId);
}

// --- Fuentes -----------------------------------------------------------------
export async function addSourceAction(formData: FormData) {
  const session = await pageGuard("source:write");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    const c = await requireCaseAccess(session, caseId);
    await prisma.source.create({
      data: {
        organizationId: c.organizationId,
        caseId,
        type: formData.get("type") as SourceType,
        origin: String(formData.get("origin") ?? ""),
        method: String(formData.get("method") ?? "") || null,
        responsible: String(formData.get("responsible") ?? "") || null,
        reliability: (formData.get("reliability") as Reliability) ?? "UNKNOWN",
        restrictions: String(formData.get("restrictions") ?? "") || null,
        reference: String(formData.get("reference") ?? "") || null,
      },
    });
  });
  rev(caseId);
}

// --- Hallazgos ---------------------------------------------------------------
export async function addFindingAction(formData: FormData) {
  const session = await pageGuard("finding:write");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    await createFinding(session, caseId, {
      observedFact: String(formData.get("observedFact") ?? ""),
      sourceId: String(formData.get("sourceId") ?? "") || null,
      evidenceId: String(formData.get("evidenceId") ?? "") || null,
      confidence: (formData.get("confidence") as ConfidenceLevel) ?? "MODERATE",
      interpretation: String(formData.get("interpretation") ?? "") || undefined,
      alternatives: String(formData.get("alternatives") ?? "") || undefined,
    });
  });
  rev(caseId);
}

// --- Línea de tiempo ---------------------------------------------------------
export async function addTimelineEventAction(formData: FormData) {
  const session = await pageGuard("finding:write");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    const c = await requireCaseAccess(session, caseId);
    const occurredRaw = String(formData.get("occurredAt") ?? "");
    await prisma.timelineEvent.create({
      data: {
        organizationId: c.organizationId,
        caseId,
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? "") || null,
        occurredAt: occurredRaw ? new Date(occurredRaw) : null,
        precision: (formData.get("precision") as TimelinePrecision) ?? "EXACT",
        kind: (formData.get("kind") as TimelineKind) ?? "FACT",
      },
    });
  });
  rev(caseId);
}

// --- Evidencia ---------------------------------------------------------------
export async function uploadEvidenceAction(formData: FormData) {
  const session = await pageGuard("evidence:upload");
  const caseId = String(formData.get("caseId"));
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect(`/consola/panel/expedientes/${caseId}/evidencia?msg=Archivo%20requerido`);
  const bytes = Buffer.from(await (file as File).arrayBuffer());
  await guarded(caseId, async () => {
    await ingestEvidence(session, caseId, {
      type: (formData.get("type") as EvidenceType) ?? "DOCUMENT",
      originalName: (file as File).name,
      mimeType: (file as File).type,
      bytes,
      description: String(formData.get("description") ?? "") || undefined,
      sourceOrigin: String(formData.get("sourceOrigin") ?? "") || undefined,
    });
  });
  rev(caseId);
}

export async function setEvidenceStatusAction(formData: FormData) {
  const session = await pageGuard("evidence:review");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    await setEvidenceStatus(session, String(formData.get("evidenceId")), formData.get("status") as EvidenceStatus);
  });
  rev(caseId);
}

export async function downloadEvidenceAction(formData: FormData) {
  const session = await pageGuard("evidence:read");
  const evidenceId = String(formData.get("evidenceId"));
  const url = await getEvidenceDownloadUrl(session, evidenceId);
  redirect(url);
}

// --- IA ----------------------------------------------------------------------
export async function runAiAction(formData: FormData) {
  const session = await pageGuard("ai:run");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    await runCaseAi(session, caseId, formData.get("operation") as AiOperation, String(formData.get("input") ?? ""));
  });
  rev(caseId);
}

export async function reviewAiOutputAction(formData: FormData) {
  const session = await pageGuard("ai:review");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    await reviewAiOutput(session, String(formData.get("outputId")), formData.get("status") as AiReviewStatus);
  });
  rev(caseId);
}

// --- Informes ----------------------------------------------------------------
export async function createReportAction(formData: FormData) {
  const session = await pageGuard("report:write");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    await createReport(session, caseId, formData.get("type") as ReportType, String(formData.get("title") ?? "Informe"));
  });
  rev(caseId);
}

export async function generateReportPdfAction(formData: FormData) {
  const session = await pageGuard("report:write");
  const url = await generateReportPdf(session, String(formData.get("reportId")));
  redirect(url);
}

export async function setReportStatusAction(formData: FormData) {
  const session = await pageGuard("report:review");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    await setReportStatus(session, String(formData.get("reportId")), formData.get("status") as ReviewStatus);
  });
  rev(caseId);
}

// --- Entregas ----------------------------------------------------------------
export async function createDeliveryAction(formData: FormData) {
  const session = await pageGuard("delivery:manage");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    const expiresRaw = String(formData.get("expiresAt") ?? "");
    await createDelivery(session, caseId, {
      reportId: String(formData.get("reportId")),
      requireMfa: formData.get("requireMfa") === "on",
      watermark: String(formData.get("watermark") ?? "") || undefined,
      expiresAt: expiresRaw ? new Date(expiresRaw) : null,
    });
  });
  rev(caseId);
}

export async function createAccessLinkAction(formData: FormData) {
  const session = await pageGuard("delivery:manage");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    await createAccessLink(session, String(formData.get("deliveryId")), String(formData.get("recipient") ?? "") || undefined);
  });
  rev(caseId);
}

export async function revokeDeliveryAction(formData: FormData) {
  const session = await pageGuard("delivery:manage");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    await revokeDelivery(session, String(formData.get("deliveryId")));
  });
  rev(caseId);
}

// --- Comunicaciones ----------------------------------------------------------
export async function addMessageAction(formData: FormData) {
  const session = await pageGuard("case:read_assigned");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    const c = await requireCaseAccess(session, caseId);
    await prisma.message.create({
      data: {
        organizationId: c.organizationId,
        caseId,
        authorUserId: session.userId,
        audience: String(formData.get("audience") ?? "internal"),
        body: String(formData.get("body") ?? ""),
      },
    });
    await recordAudit({ organizationId: c.organizationId, actorUserId: session.userId, action: "message.add", resourceType: "case", resourceId: caseId });
  });
  rev(caseId);
}

export async function answerRfiAction(formData: FormData) {
  const session = await pageGuard("case:read_assigned");
  const caseId = String(formData.get("caseId"));
  const rfiId = String(formData.get("rfiId"));
  await guarded(caseId, async () => {
    await requireCaseAccess(session, caseId);
    await prisma.requestForInformation.updateMany({
      where: { id: rfiId, caseId },
      data: { status: "answered", answeredAt: new Date() },
    });
  });
  rev(caseId);
}

// --- Facturación operativa ---------------------------------------------------
export async function setBudgetAction(formData: FormData) {
  const session = await pageGuard("case:update");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    const c = await requireCaseAccess(session, caseId);
    await prisma.budget.create({
      data: {
        organizationId: c.organizationId,
        caseId,
        amount: String(formData.get("amount") ?? "0"),
        currency: String(formData.get("currency") ?? "USD"),
        depositAmount: String(formData.get("depositAmount") ?? "") || null,
        paymentStatus: (formData.get("paymentStatus") as PaymentStatus) ?? "PENDING",
      },
    });
  });
  rev(caseId);
}

export async function addExpenseAction(formData: FormData) {
  const session = await pageGuard("case:update");
  const caseId = String(formData.get("caseId"));
  await guarded(caseId, async () => {
    const c = await requireCaseAccess(session, caseId);
    await prisma.expense.create({
      data: {
        organizationId: c.organizationId,
        caseId,
        description: String(formData.get("description") ?? ""),
        amount: String(formData.get("amount") ?? "0"),
        currency: String(formData.get("currency") ?? "USD"),
        authorized: formData.get("authorized") === "on",
      },
    });
  });
  rev(caseId);
}
