# Seguridad, retención y cumplimiento — SPECTRUM

## Autenticación y sesiones

- Sesiones firmadas con **HMAC-SHA256** (`AUTH_SECRET`), en cookie **httpOnly**,
  `SameSite=Lax`, `Secure` en producción, expiración 8 h. Ver
  `src/lib/auth/session.ts`.
- Contraseñas con **scrypt** + sal aleatoria por usuario y comparación en
  tiempo constante (`src/lib/auth/password.ts`).
- **MFA para administradores**: el modelo (`users.mfaEnabled/mfaSecret`) está
  previsto; el segundo factor se activa en la fase de endurecimiento.
- `middleware.ts` protege `/consola/panel/*`; los permisos granulares se aplican
  además en cada página/handler (`requirePermission`).

## Autorización (RBAC)

Siete roles con permisos por recurso y **mínimo acceso necesario**. El
investigador/analista solo ve expedientes **asignados**. Detalle en
[`MODELO_PERMISOS.md`](MODELO_PERMISOS.md).

## Aislamiento multi-tenant

Toda entidad operativa referencia `organizationId`. Las consultas deben
filtrar siempre por la organización de la sesión; el acceso a un expediente
concreto se restringe además por asignación. Objetivo de pruebas: **IDOR** y
fuga entre organizaciones.

## Datos y almacenamiento

- Evidencia y PDFs en **almacenamiento de objetos privado** (nunca público);
  acceso mediante **URLs firmadas y expirables**.
- Cifrado **en tránsito** (HTTPS/HSTS) y **en reposo** cuando el proveedor lo
  ofrece; campos especialmente sensibles pueden cifrarse con `ENCRYPTION_KEY`.
- **Secretos** exclusivamente en variables de entorno (ver `.env.example`);
  nunca en el repositorio.
- **Logs** sin contenido sensible innecesario; las IP se almacenan **hasheadas**
  (SHA-256) en auditoría.

## Cadena de custodia

Cada elemento de evidencia conserva identificador, nombre original separado del
interno, tipo MIME, tamaño, **hash SHA-256**, origen, fecha de obtención,
usuario que cargó, estado e **historial de accesos/transferencias**
(`evidence_events`). El archivo original se preserva; toda nueva versión es un
elemento derivado relacionado, nunca un reemplazo.

## Endpoints y abuso

- **Rate limiting** en endpoints públicos (`src/lib/rate-limit.ts`). En
  producción multi-instancia debe respaldarse con un almacén compartido
  (Redis/Upstash) — la implementación en memoria es best-effort.
- **Honeypot** anti-spam en el formulario público.
- Cabeceras de seguridad (`next.config.mjs`): `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `HSTS`.
- Validación de entrada con **Zod** en todos los límites de confianza.

## Cumplimiento (compliance)

`src/lib/compliance.ts` realiza un **screening** heurístico que marca
solicitudes cuyo objetivo aparente implica **métodos prohibidos** (acceso no
autorizado, vigilancia intrusiva, suplantación, interceptación, malware,
extracción clandestina, reconocimiento facial). Una solicitud marcada:

1. No se acepta automáticamente: pasa a **triage humano** (`IN_TRIAGE`).
2. Se registra en auditoría con las categorías detectadas.
3. Se escala al responsable designado.

Reglas de bloqueo del PRD (art. 10) que rigen la evaluación de viabilidad: no
iniciar investigaciones con objetivo de acceso no autorizado; no iniciar sin
consentimiento/base legítima cuando corresponde; bloquear vigilancia, intrusión,
suplantación o extracción clandestina; escalar cualquier duda legal.

## Auditoría

`recordAudit()` registra accesos, descargas, exportaciones, cambios de estado,
generación de IA y entregas, con metadatos mínimos, IP hasheada y user-agent. La
auditoría nunca interrumpe la operación principal.

## Retención y eliminación

- `retention_policies` define días de retención y acción al expirar (retener,
  revisar, anonimizar, eliminar). El job `retention_review` identifica los
  expedientes aplicables.
- `deletion_requests` gestiona solicitudes de eliminación con aprobación y
  registro de ejecución, conforme a la normativa aplicable.
- Backups cifrados y restaurables (responsabilidad del proveedor de BD +
  `backup_audit_export`).

## Cobertura de pruebas de seguridad (objetivo)

IDOR · aislamiento multi-tenant · archivos maliciosos · URLs expiradas · prompt
injection · XSS · CSRF · sesiones · webhooks · bloqueo de métodos prohibidos ·
consentimiento faltante · conflicto de interés · auditoría.
