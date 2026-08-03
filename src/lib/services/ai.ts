import type { AiReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { runAi, type AiOperation } from "@/lib/adapters/ai";
import { recordAudit } from "@/lib/audit";
import { requireCaseAccess, AccessError } from "@/lib/auth/guards";
import type { SessionPayload } from "@/lib/auth/session";

/**
 * Ejecuta una operación de IA sobre material de un expediente. El resultado se
 * guarda SIEMPRE como borrador pendiente de revisión humana y registra
 * proveedor, modelo, prompt_version, documentos usados, usuario y advertencias
 * (art. 16 del PRD). La IA nunca cierra conclusiones automáticamente.
 */
export async function runCaseAi(
  session: SessionPayload,
  caseId: string,
  operation: AiOperation,
  inputText: string,
  inputDocs: string[] = [],
) {
  const current = await requireCaseAccess(session, caseId);

  const run = await prisma.aiRun.create({
    data: {
      organizationId: current.organizationId,
      caseId,
      provider: process.env.AI_DEFAULT_PROVIDER ?? "local",
      model: process.env.AI_DEFAULT_MODEL ?? "local-heuristic",
      promptVersion: `${operation}@pending`,
      operation,
      inputDocs,
      requestedBy: session.userId,
      status: "running",
    },
  });

  const result = await runAi(operation, inputText);

  await prisma.aiRun.update({
    where: { id: run.id },
    data: {
      provider: result.provider,
      model: result.model,
      promptVersion: result.promptVersion,
      warnings: result.warnings,
      status: "done",
      finishedAt: new Date(),
    },
  });

  const output = await prisma.aiOutput.create({
    data: {
      aiRunId: run.id,
      content: result.content,
      isDraft: true,
      reviewStatus: "PENDING_HUMAN_REVIEW",
    },
  });

  await recordAudit({
    organizationId: current.organizationId,
    actorUserId: session.userId,
    action: "ai.run",
    resourceType: "ai_run",
    resourceId: run.id,
    metadata: { operation, provider: result.provider, model: result.model, promptVersion: result.promptVersion, inputDocs },
  });

  return { run, output, result };
}

export async function reviewAiOutput(session: SessionPayload, outputId: string, status: AiReviewStatus) {
  const output = await prisma.aiOutput.findUnique({ where: { id: outputId }, include: { aiRun: true } });
  if (!output || output.aiRun.organizationId !== session.organizationId) throw new AccessError(404, "No encontrado.");
  await requireCaseAccess(session, output.aiRun.caseId);

  const updated = await prisma.aiOutput.update({
    where: { id: outputId },
    data: { reviewStatus: status, reviewedBy: session.userId, reviewedAt: new Date() },
  });

  await recordAudit({
    organizationId: output.aiRun.organizationId,
    actorUserId: session.userId,
    action: "ai.review",
    resourceType: "ai_output",
    resourceId: outputId,
    metadata: { status },
  });

  return updated;
}
