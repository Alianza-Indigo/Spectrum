import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/current-user";
import { canAny, caseVisibility, type Permission, type Role } from "@/lib/auth/rbac";
import type { SessionPayload } from "@/lib/auth/session";

/**
 * Guards de autorización para la consola. Refuerzan el aislamiento multi-tenant
 * y evitan IDOR: toda consulta se limita a la organización de la sesión y, para
 * roles "de campo", a los expedientes asignados.
 */

export class AccessError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Cláusula `where` base para acotar por organización. */
export function orgScope(session: SessionPayload) {
  return { organizationId: session.organizationId ?? "__none__" };
}

/** Verifica un permiso o lanza AccessError(403). */
export function assertPermission(session: SessionPayload, permission: Permission): void {
  if (!canAny(session.roles as Role[], permission)) {
    throw new AccessError(403, "No autorizado.");
  }
}

/**
 * Devuelve el conjunto de IDs de expedientes visibles para la sesión, o `null`
 * si la visibilidad es de organización completa (sin restricción por asignación).
 */
export async function visibleCaseIds(session: SessionPayload): Promise<string[] | null> {
  if (caseVisibility(session.roles as Role[]) === "all") return null;
  const assignments = await prisma.caseAssignment.findMany({
    where: { userId: session.userId },
    select: { caseId: true },
  });
  return assignments.map((a) => a.caseId);
}

/** `where` para listar expedientes respetando organización y asignación. */
export async function caseListWhere(session: SessionPayload) {
  const ids = await visibleCaseIds(session);
  return {
    ...orgScope(session),
    ...(ids ? { id: { in: ids } } : {}),
  };
}

/**
 * Carga un expediente asegurando que pertenece a la organización y que la
 * sesión tiene acceso (asignación cuando corresponde). Lanza notFound si no.
 */
export async function requireCaseAccess(session: SessionPayload, caseId: string) {
  const found = await prisma.case.findFirst({
    where: { id: caseId, ...orgScope(session) },
  });
  if (!found) notFound();

  const ids = await visibleCaseIds(session);
  if (ids && !ids.includes(caseId)) {
    // Existe pero no está asignado a este usuario de campo.
    notFound();
  }
  return found;
}

/** Sesión + permiso para páginas de consola (redirige si falta). */
export async function pageGuard(permission?: Permission): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/consola");
  if (permission && !canAny(session.roles as Role[], permission)) redirect("/consola/panel");
  return session;
}
