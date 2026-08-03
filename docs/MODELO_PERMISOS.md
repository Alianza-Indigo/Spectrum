# Modelo de permisos (RBAC) — SPECTRUM

Fuente de verdad: [`src/lib/auth/rbac.ts`](../src/lib/auth/rbac.ts). Los permisos
se conceden por rol y toda mutación sensible se verifica con `can()`/`canAny()`
y se registra en auditoría. El acceso a un expediente concreto se restringe
además por asignación (`caseVisibility`).

## Roles

| Rol | Descripción |
|-----|-------------|
| `DIRECTOR` | Administra clientes, expedientes, asignaciones, entregas e informes. |
| `INVESTIGATOR` | Accede solo a expedientes/tareas asignadas; registra actividades, fuentes, hallazgos y evidencia. |
| `ANALYST` | Organiza y cruza información lícita; líneas de tiempo, matrices y borradores. |
| `QUALITY_REVIEWER` | Revisa consistencia, fuentes, evidencia y conclusiones antes de entregar. |
| `ADMIN` | Usuarios, permisos, plantillas, catálogos, integraciones, retención, seguridad y auditoría. |
| `CLIENT` | Consulta expedientes autorizados, avances, entregables y mensajes. |
| `EXTERNAL_AUDITOR` | Acceso temporal, limitado y de solo lectura a un expediente/entrega. |

## Matriz de permisos

| Permiso | ADMIN | DIRECTOR | QUALITY | ANALYST | INVEST. | CLIENT | AUDITOR |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| client:read / write | ✅ | ✅ | – | – | – | – | – |
| case:read (organización) | ✅ | ✅ | ✅ | – | – | – | – |
| case:read_assigned | ✅ | ✅ | ✅ | ✅ | ✅ | – | ✅ |
| case:create / update | ✅ | ✅ | – | – | – | – | – |
| case:open | ✅ | ✅ | – | – | – | – | – |
| case:viability / authorize | ✅ | ✅ | – | – | – | – | – |
| task:read | ✅ | ✅ | ✅ | ✅ | ✅ | – | – |
| task:write / activity:write | ✅ | ✅ | – | ✅ | ✅ | – | – |
| source:write / finding:write | ✅ | ✅ | ✅ | ✅ | ✅ | – | – |
| evidence:read | ✅ | ✅ | ✅ | ✅ | ✅ | – | ✅ |
| evidence:upload | ✅ | ✅ | – | – | ✅ | – | – |
| evidence:review | ✅ | ✅ | ✅ | – | – | – | – |
| ai:run | ✅ | ✅ | – | ✅ | – | – | – |
| ai:review | ✅ | ✅ | ✅ | – | – | – | – |
| report:write | ✅ | ✅ | – | ✅ | – | – | – |
| report:review | ✅ | ✅ | ✅ | – | – | – | – |
| delivery:manage | ✅ | ✅ | – | – | – | – | – |
| portal:read / request | ✅ | – | – | – | – | ✅ | – |
| org:manage / user:manage | ✅ | – | – | – | – | – | – |
| audit:read | ✅ | ✅ | – | – | – | – | ✅ |
| retention:manage | ✅ | – | – | – | – | – | – |

## Visibilidad de expedientes

`caseVisibility(roles)` devuelve:

- `"all"` para `ADMIN`, `DIRECTOR`, `QUALITY_REVIEWER` (toda su organización).
- `"assigned"` para el resto (solo expedientes donde estén asignados). El
  `EXTERNAL_AUDITOR` se limita además a lo explícitamente compartido.
