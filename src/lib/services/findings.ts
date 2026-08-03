import type { ConfidenceLevel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requireCaseAccess, AccessError } from "@/lib/auth/guards";
import type { SessionPayload } from "@/lib/auth/session";

export type FindingInput = {
  observedFact: string;
  sourceId?: string | null;
  evidenceId?: string | null;
  factDate?: Date | null;
  confidence?: ConfidenceLevel;
  interpretation?: string;
  alternatives?: string;
  errorRisk?: string;
};

/**
 * Crea un hallazgo. INVARIANTE: no se permite registrar un hecho/conclusión sin
 * al menos una fuente o evidencia asociada (art. 13.2 del PRD).
 */
export async function createFinding(session: SessionPayload, caseId: string, input: FindingInput) {
  const current = await requireCaseAccess(session, caseId);

  if (!input.sourceId && !input.evidenceId) {
    throw new AccessError(422, "Un hallazgo requiere al menos una fuente o evidencia asociada.");
  }

  // Verificar que la fuente/evidencia pertenece al mismo expediente.
  if (input.sourceId) {
    const src = await prisma.source.findFirst({ where: { id: input.sourceId, caseId } });
    if (!src) throw new AccessError(422, "La fuente no pertenece a este expediente.");
  }
  if (input.evidenceId) {
    const ev = await prisma.evidenceItem.findFirst({ where: { id: input.evidenceId, caseId } });
    if (!ev) throw new AccessError(422, "La evidencia no pertenece a este expediente.");
  }

  const finding = await prisma.finding.create({
    data: {
      organizationId: current.organizationId,
      caseId,
      observedFact: input.observedFact,
      sourceId: input.sourceId ?? null,
      evidenceId: input.evidenceId ?? null,
      factDate: input.factDate ?? null,
      confidence: input.confidence ?? "MODERATE",
      interpretation: input.interpretation ?? null,
      alternatives: input.alternatives ?? null,
      errorRisk: input.errorRisk ?? null,
      reviewStatus: "DRAFT",
      createdByUser: session.userId,
    },
  });

  await recordAudit({
    organizationId: current.organizationId,
    actorUserId: session.userId,
    action: "finding.create",
    resourceType: "finding",
    resourceId: finding.id,
    metadata: { caseId },
  });

  return finding;
}
