# Arquitectura técnica — SPECTRUM

## Visión general

SPECTRUM es una aplicación **Next.js (App Router)** desplegable en **Vercel**,
con **PostgreSQL** como almacén principal a través de **Prisma**. El diseño
evita procesos residentes y el uso del filesystem local como almacenamiento
permanente: la evidencia vive en **almacenamiento de objetos privado** y las
tareas asíncronas se ejecutan como **jobs** disparados por cron.

```
Visitante ─▶ Sitio público (Server Components) ─▶ POST /api/public/inquiries ─▶ PostgreSQL
Personal  ─▶ /consola (Auth HMAC + RBAC) ─▶ Consola (Server Components) ─▶ PostgreSQL
                                              │
                                              ├─▶ Almacenamiento privado (evidencia, PDFs)
                                              ├─▶ Proveedor de correo transaccional
                                              └─▶ Adaptadores de IA (Anthropic / OpenAI)
Vercel Cron ─▶ /api/jobs/* (CRON_SECRET) ─▶ cola persistente en BD
```

## Principios de diseño

- **Server Components** para vistas de lectura; **Route Handlers / Server
  Actions** para mutaciones.
- **Multi-tenancy** con aislamiento obligatorio por `organizationId` en toda
  entidad operativa, reforzado además por asignación a nivel de expediente.
- **Privacidad por diseño**: datos sensibles separados de la información
  operacional y expuestos según permisos.
- **Auditabilidad**: toda acción sensible pasa por `recordAudit()`.
- **Degradación**: la plataforma funciona con la IA desactivada.

## Capas

| Capa | Responsabilidad |
|------|-----------------|
| `app/(site)` | Sitio público y conversión |
| `app/consola` | Autenticación y consola operativa |
| `app/api` | Endpoints públicos y (futuro) endpoints de jobs |
| `lib/auth` | RBAC, sesiones firmadas, contraseñas, sesión actual |
| `lib/*` | Auditoría, cumplimiento, validación, folio, rate limit |
| `prisma` | Modelo de datos y migraciones |

## Modelo de datos

Definido en [`prisma/schema.prisma`](../prisma/schema.prisma). Agrupaciones:

- **Identidad y tenencia**: `organizations`, `users`, `organization_members`.
- **Clientes**: `clients`, `client_contacts`.
- **Expedientes**: `cases`, `case_assignments`, `case_authorizations`,
  `viability_reviews`.
- **Plan y ejecución**: `investigation_plans`, `investigation_questions`,
  `tasks`, `activities`.
- **Inteligencia**: `entities`, `relationships`, `sources`, `findings`,
  `timeline_events`.
- **Evidencia**: `evidence_items`, `evidence_events` (cadena de custodia).
- **IA**: `ai_runs`, `ai_outputs` (proveedor, modelo, `promptVersion`, revisión
  humana).
- **Informes y entrega**: `reports`, `report_versions`, `report_sections`,
  `deliveries`, `delivery_access`.
- **Comunicaciones**: `messages`, `requests_for_information`.
- **Finanzas**: `budgets`, `time_entries`, `expenses`.
- **Operación**: `notifications`, `templates`, `audit_logs`,
  `retention_policies`, `deletion_requests`.
- **Público**: `inquiries`.

Convenciones: UUID como PK, `createdAt`/`updatedAt` en UTC, índices por
`organizationId` y por columnas de consulta frecuente. La evidencia y las
actividades son **inmutables en lo esencial**: las correcciones se registran
como nuevas filas relacionadas.

## Invariantes de negocio (capa de aplicación)

- No se permite pasar un caso a `ABIERTO` sin cliente, alcance, responsable,
  autorización y condiciones aceptadas.
- No se registra una conclusión como hecho sin al menos una fuente/evidencia.
- Ningún archivo de evidencia se reemplaza: toda nueva versión es un elemento
  relacionado.
- La IA no cierra conclusiones automáticamente; todo `ai_output` nace como
  borrador `PENDING_HUMAN_REVIEW`.

## Jobs (Vercel Cron)

Todos con lock, timeout, reintentos, idempotency key y registro:

| Job | Función |
|-----|---------|
| `process_ai_jobs` | Procesa análisis cortos y reanudables |
| `generate_report_pdf` | Genera documentos pendientes |
| `hash_uploaded_evidence` | Calcula hash SHA-256 y metadatos |
| `send_notifications` | Correo y avisos |
| `expire_delivery_links` | Revoca enlaces vencidos |
| `retention_review` | Identifica expedientes por retención |
| `backup_audit_export` | Exporta registros autorizados |
| `release_stuck_jobs` | Libera tareas bloqueadas |

## API principal

Todos los endpoints están implementados. Cada uno define esquema de entrada
(Zod), respuesta, errores, permiso requerido y evento de auditoría; los jobs son
idempotentes y están protegidos con `CRON_SECRET`.

```
POST   /api/public/inquiries          ✅
GET    /api/cases                      · POST /api/cases
GET    /api/cases/:id                  · PATCH /api/cases/:id
POST   /api/cases/:id/viability-review · /authorizations · /plan
POST   /api/cases/:id/tasks · /activities · /sources · /findings
POST   /api/cases/:id/evidence/upload  · GET /api/cases/:id/timeline
POST   /api/cases/:id/ai/summarize · /ai/analyze
POST   /api/cases/:id/reports · /api/reports/:id/submit-review · /deliver
POST   /api/deliveries/:id/revoke · /api/client-portal/requests
GET    /api/audit-logs
```
