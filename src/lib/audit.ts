import { prisma } from "@/lib/db";
import { sha256Hex } from "@/lib/utils";

/**
 * Registro de auditoría. Toda acción sensible (accesos, descargas,
 * exportaciones, cambios de estado, generación de IA, entregas) debe llamar a
 * `recordAudit`. Nunca se registran contenidos sensibles innecesarios: solo
 * metadatos suficientes para trazabilidad.
 */
export type AuditInput = {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
};

export async function recordAudit(input: AuditInput): Promise<void> {
  const ipHash = input.ip ? await sha256Hex(input.ip) : null;
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        metadata: (input.metadata ?? {}) as object,
        ipHash,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    // La auditoría nunca debe tumbar la operación principal; se registra el
    // fallo para observabilidad, pero no se propaga.
    console.error("[audit] no se pudo registrar el evento:", err);
  }
}

/** Extrae la IP del request respetando cabeceras de proxy comunes. */
export function clientIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip");
}
