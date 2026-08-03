/**
 * Control de acceso basado en roles (RBAC) para SPECTRUM.
 *
 * Principio de mínimo acceso necesario:
 *  - Los permisos se conceden por rol.
 *  - El acceso a un expediente concreto se restringe además por asignación
 *    (ver `caseVisibility`): el investigador solo ve lo asignado.
 *
 * Esta tabla es la fuente de verdad de permisos a nivel de aplicación; toda
 * mutación sensible debe verificarse con `can()` y registrarse en auditoría.
 */

export type Role =
  | "DIRECTOR"
  | "INVESTIGATOR"
  | "ANALYST"
  | "QUALITY_REVIEWER"
  | "ADMIN"
  | "CLIENT"
  | "EXTERNAL_AUDITOR";

export type Permission =
  // Clientes
  | "client:read"
  | "client:write"
  // Expedientes
  | "case:read"
  | "case:read_assigned"
  | "case:create"
  | "case:update"
  | "case:open" // transición a ABIERTO (requiere autorización + alcance)
  | "case:viability"
  | "case:authorize"
  // Tareas / actividades
  | "task:read"
  | "task:write"
  | "activity:write"
  // Fuentes / hallazgos
  | "source:write"
  | "finding:write"
  // Evidencia
  | "evidence:read"
  | "evidence:upload"
  | "evidence:review"
  // IA
  | "ai:run"
  | "ai:review"
  // Informes / entregas
  | "report:write"
  | "report:review"
  | "delivery:manage"
  // Portal cliente
  | "portal:read"
  | "portal:request"
  // Administración
  | "org:manage"
  | "user:manage"
  | "audit:read"
  | "retention:manage";

const ALL: Permission[] = [
  "client:read", "client:write",
  "case:read", "case:read_assigned", "case:create", "case:update", "case:open", "case:viability", "case:authorize",
  "task:read", "task:write", "activity:write",
  "source:write", "finding:write",
  "evidence:read", "evidence:upload", "evidence:review",
  "ai:run", "ai:review",
  "report:write", "report:review", "delivery:manage",
  "portal:read", "portal:request",
  "org:manage", "user:manage", "audit:read", "retention:manage",
];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ALL,
  DIRECTOR: [
    "client:read", "client:write",
    "case:read", "case:create", "case:update", "case:open", "case:viability", "case:authorize",
    "task:read", "task:write", "activity:write",
    "source:write", "finding:write",
    "evidence:read", "evidence:upload", "evidence:review",
    "ai:run", "ai:review",
    "report:write", "report:review", "delivery:manage",
    "audit:read",
  ],
  QUALITY_REVIEWER: [
    "case:read",
    "task:read",
    "source:write", "finding:write",
    "evidence:read", "evidence:review",
    "ai:review",
    "report:review",
  ],
  ANALYST: [
    "case:read_assigned",
    "task:read", "task:write", "activity:write",
    "source:write", "finding:write",
    "evidence:read",
    "ai:run",
    "report:write",
  ],
  INVESTIGATOR: [
    "case:read_assigned",
    "task:read", "task:write", "activity:write",
    "source:write", "finding:write",
    "evidence:read", "evidence:upload",
  ],
  CLIENT: [
    "portal:read", "portal:request",
  ],
  EXTERNAL_AUDITOR: [
    "case:read_assigned",
    "evidence:read",
    "audit:read",
  ],
};

/** ¿El rol tiene el permiso solicitado? */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** ¿Alguno de los roles del usuario concede el permiso? */
export function canAny(roles: Role[], permission: Permission): boolean {
  return roles.some((r) => can(r, permission));
}

/**
 * Reglas de visibilidad de expediente. Los roles "de campo" solo ven casos
 * donde estén asignados; dirección/calidad/admin ven todos los de su
 * organización. El auditor externo se limita a lo explícitamente compartido.
 */
export function caseVisibility(roles: Role[]): "all" | "assigned" {
  const orgWide: Role[] = ["ADMIN", "DIRECTOR", "QUALITY_REVIEWER"];
  return roles.some((r) => orgWide.includes(r)) ? "all" : "assigned";
}

export const roleLabels: Record<Role, string> = {
  DIRECTOR: "Director de agencia",
  INVESTIGATOR: "Investigador",
  ANALYST: "Analista",
  QUALITY_REVIEWER: "Revisor de calidad",
  ADMIN: "Administrador",
  CLIENT: "Cliente",
  EXTERNAL_AUDITOR: "Auditor externo",
};
