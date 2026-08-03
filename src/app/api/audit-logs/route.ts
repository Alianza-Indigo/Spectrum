import { authorize, ok } from "@/lib/api";
import { orgScope } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/audit-logs — últimos 100 eventos de auditoría de la organización.
 * Filtros opcionales: ?resourceType= y ?action=.
 */
export async function GET(request: Request) {
  const a = await authorize("audit:read");
  if ("error" in a) return a.error;
  const { session } = a;

  const url = new URL(request.url);
  const resourceType = url.searchParams.get("resourceType");
  const action = url.searchParams.get("action");

  const where: Prisma.AuditLogWhereInput = {
    organizationId: orgScope(session).organizationId,
    ...(resourceType ? { resourceType } : {}),
    ...(action ? { action } : {}),
  };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return ok(logs);
}
