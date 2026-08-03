import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requireCaseAccess, AccessError } from "@/lib/auth/guards";
import type { SessionPayload } from "@/lib/auth/session";

/**
 * Entrega controlada al cliente mediante enlace con expiración y revocación.
 * El enlace nunca expone notas internas ni evidencia no autorizada.
 */
export type DeliveryInput = {
  reportId: string;
  requireMfa?: boolean;
  watermark?: string;
  expiresAt?: Date | null;
};

export async function createDelivery(session: SessionPayload, caseId: string, input: DeliveryInput) {
  const current = await requireCaseAccess(session, caseId);

  const report = await prisma.report.findFirst({ where: { id: input.reportId, caseId } });
  if (!report) throw new AccessError(422, "El informe no pertenece a este expediente.");

  const delivery = await prisma.delivery.create({
    data: {
      organizationId: current.organizationId,
      caseId,
      reportId: input.reportId,
      status: "PREPARED",
      requireMfa: input.requireMfa ?? false,
      watermark: input.watermark ?? null,
      expiresAt: input.expiresAt ?? null,
      createdByUser: session.userId,
    },
  });

  await recordAudit({
    organizationId: current.organizationId,
    actorUserId: session.userId,
    action: "delivery.create",
    resourceType: "delivery",
    resourceId: delivery.id,
    metadata: { caseId, reportId: input.reportId },
  });

  return delivery;
}

/** Crea un enlace de acceso único para un destinatario y lo marca como enviado. */
export async function createAccessLink(session: SessionPayload, deliveryId: string, recipient?: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.organizationId !== session.organizationId) throw new AccessError(404, "No encontrado.");
  await requireCaseAccess(session, delivery.caseId);
  if (delivery.status === "REVOKED") throw new AccessError(422, "La entrega está revocada.");

  const token = nanoid(32);
  await prisma.deliveryAccess.create({ data: { deliveryId, token, recipient: recipient ?? null } });
  await prisma.delivery.update({ where: { id: deliveryId }, data: { status: "SENT" } });

  await recordAudit({
    organizationId: delivery.organizationId,
    actorUserId: session.userId,
    action: "delivery.link",
    resourceType: "delivery",
    resourceId: deliveryId,
    metadata: { recipient },
  });

  return { token, url: `/entrega/${token}` };
}

export async function revokeDelivery(session: SessionPayload, deliveryId: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery || delivery.organizationId !== session.organizationId) throw new AccessError(404, "No encontrado.");
  await requireCaseAccess(session, delivery.caseId);

  const updated = await prisma.delivery.update({
    where: { id: deliveryId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  await recordAudit({
    organizationId: delivery.organizationId,
    actorUserId: session.userId,
    action: "delivery.revoke",
    resourceType: "delivery",
    resourceId: deliveryId,
  });
  return updated;
}

/** Resuelve un enlace de entrega público (portal del cliente). */
export async function resolveDeliveryByToken(token: string) {
  const access = await prisma.deliveryAccess.findUnique({
    where: { token },
    include: {
      delivery: {
        include: {
          report: {
            include: {
              versions: { orderBy: { version: "desc" }, take: 1 },
              case: { select: { folio: true } },
            },
          },
        },
      },
    },
  });
  if (!access) return { ok: false as const, reason: "not_found" as const };

  const { delivery } = access;
  if (delivery.status === "REVOKED") return { ok: false as const, reason: "revoked" as const };
  if (delivery.expiresAt && delivery.expiresAt < new Date()) return { ok: false as const, reason: "expired" as const };

  return { ok: true as const, access, delivery };
}

export async function markDeliveryViewed(token: string) {
  await prisma.deliveryAccess.update({ where: { token }, data: { viewedAt: new Date() } }).catch(() => undefined);
  const access = await prisma.deliveryAccess.findUnique({ where: { token } });
  if (access) {
    await prisma.delivery.update({ where: { id: access.deliveryId }, data: { status: "VIEWED" } }).catch(() => undefined);
    await recordAudit({ action: "delivery.view", resourceType: "delivery", resourceId: access.deliveryId });
  }
}

export async function markDeliveryDownloaded(token: string) {
  const access = await prisma.deliveryAccess.findUnique({ where: { token } });
  if (!access) return;
  await prisma.deliveryAccess.update({ where: { token }, data: { downloadedAt: new Date() } }).catch(() => undefined);
  await prisma.delivery.update({ where: { id: access.deliveryId }, data: { status: "DOWNLOADED" } }).catch(() => undefined);
  await recordAudit({ action: "delivery.download", resourceType: "delivery", resourceId: access.deliveryId });
}
