import type { EvidenceType, EvidenceStatus, ConfidentialityLevel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { storeObject, readObject, signDownloadUrl } from "@/lib/adapters/storage";
import { recordAudit } from "@/lib/audit";
import { requireCaseAccess, AccessError } from "@/lib/auth/guards";
import type { SessionPayload } from "@/lib/auth/session";

export type IngestInput = {
  type: EvidenceType;
  originalName: string;
  mimeType?: string;
  bytes: Buffer;
  description?: string;
  sourceOrigin?: string;
  obtainedAt?: Date | null;
  confidentiality?: ConfidentialityLevel;
};

/**
 * Incorpora un elemento de evidencia: guarda el archivo ORIGINAL en
 * almacenamiento privado, calcula su hash SHA-256 e inicia la cadena de
 * custodia. El original nunca se reemplaza (art. 14 del PRD).
 */
export async function ingestEvidence(session: SessionPayload, caseId: string, input: IngestInput) {
  const current = await requireCaseAccess(session, caseId);
  const orgId = current.organizationId;

  const object = await storeObject({
    organizationId: orgId,
    contentType: input.mimeType ?? "application/octet-stream",
    bytes: input.bytes,
    createdByUser: session.userId,
    keyHint: "evidence",
  });

  const count = await prisma.evidenceItem.count({ where: { caseId } });
  const item = await prisma.evidenceItem.create({
    data: {
      organizationId: orgId,
      caseId,
      type: input.type,
      internalName: `${current.folio}-E${String(count + 1).padStart(3, "0")}`,
      originalName: input.originalName,
      mimeType: input.mimeType ?? null,
      sizeBytes: BigInt(object.sizeBytes),
      sha256: object.sha256,
      storageKey: object.id,
      sourceOrigin: input.sourceOrigin ?? null,
      obtainedAt: input.obtainedAt ?? null,
      description: input.description ?? null,
      confidentiality: input.confidentiality ?? "SENSITIVE",
      status: "RECEIVED",
      uploadedByUser: session.userId,
    },
  });

  await prisma.evidenceEvent.create({
    data: { evidenceId: item.id, type: "UPLOADED", actorUserId: session.userId, detail: `Hash SHA-256 ${object.sha256}` },
  });

  await recordAudit({
    organizationId: orgId,
    actorUserId: session.userId,
    action: "evidence.ingest",
    resourceType: "evidence_item",
    resourceId: item.id,
    metadata: { caseId, sha256: object.sha256, sizeBytes: object.sizeBytes },
  });

  return item;
}

export async function setEvidenceStatus(session: SessionPayload, evidenceId: string, status: EvidenceStatus, detail?: string) {
  const item = await prisma.evidenceItem.findUnique({ where: { id: evidenceId } });
  if (!item || item.organizationId !== session.organizationId) throw new AccessError(404, "No encontrado.");
  await requireCaseAccess(session, item.caseId);

  const updated = await prisma.evidenceItem.update({ where: { id: evidenceId }, data: { status } });
  await prisma.evidenceEvent.create({
    data: {
      evidenceId,
      type: status === "EXCLUDED" ? "EXCLUDED" : status === "ANNEXED" ? "ANNEXED" : "STATUS_CHANGED",
      actorUserId: session.userId,
      detail: detail ?? `Estado → ${status}`,
    },
  });
  await recordAudit({
    organizationId: item.organizationId,
    actorUserId: session.userId,
    action: "evidence.status",
    resourceType: "evidence_item",
    resourceId: evidenceId,
    metadata: { status },
  });
  return updated;
}

/** Genera una URL firmada y expirable para descargar el original y registra el acceso. */
export async function getEvidenceDownloadUrl(session: SessionPayload, evidenceId: string) {
  const item = await prisma.evidenceItem.findUnique({ where: { id: evidenceId } });
  if (!item || item.organizationId !== session.organizationId || !item.storageKey) {
    throw new AccessError(404, "No encontrado.");
  }
  await requireCaseAccess(session, item.caseId);
  const object = await readObject(item.storageKey);
  if (!object) throw new AccessError(404, "Objeto no disponible.");

  await prisma.evidenceEvent.create({
    data: { evidenceId, type: "DOWNLOADED", actorUserId: session.userId },
  });
  await recordAudit({
    organizationId: item.organizationId,
    actorUserId: session.userId,
    action: "evidence.download",
    resourceType: "evidence_item",
    resourceId: evidenceId,
  });
  return signDownloadUrl(object, { ttlSeconds: 300, filename: item.originalName });
}
