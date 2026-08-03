# Despliegue en Vercel — SPECTRUM

La aplicación está diseñada para Vercel: sin procesos residentes y sin usar el
filesystem local como almacenamiento permanente.

## 1. Requisitos

- Cuenta de Vercel y proyecto conectado a este repositorio.
- **PostgreSQL serverless** (Vercel Postgres, Neon, Supabase…).
- **Almacenamiento de objetos privado** (S3 / R2 / Vercel Blob) para evidencia y
  PDFs.
- Proveedor de **correo transaccional** (Resend, Postmark, SES…).
- Opcional: claves de IA (Anthropic / OpenAI).

## 2. Variables de entorno

Configura en Vercel (Project → Settings → Environment Variables) las claves de
[`.env.example`](../.env.example). Imprescindibles para arrancar:

```
APP_URL=https://tu-dominio
AUTH_SECRET=            # openssl rand -base64 32
DATABASE_URL=           # postgres serverless con sslmode=require
ENCRYPTION_KEY=         # openssl rand -base64 32
CRON_SECRET=            # protege los endpoints de jobs
```

Añade las de almacenamiento, correo e IA cuando actives esos módulos.

## 3. Build

Vercel usa por defecto:

```
Install:  npm install
Build:    npm run build        # ejecuta `prisma generate` + `next build`
```

No se requiere configuración especial: el `build` genera el cliente de Prisma.

## 4. Migraciones de base de datos

Aplica el esquema antes del primer arranque (desde tu entorno o un paso de CI):

```bash
npx prisma migrate deploy      # con migraciones versionadas
# o, para prototipos:
npx prisma db push
```

Datos de demostración (opcional, entorno de prueba):

```bash
npm run db:seed
```

## 5. Jobs programados (Vercel Cron)

Los endpoints `/api/jobs/*` están implementados (idempotentes y protegidos con
`CRON_SECRET`). Declara su calendario en `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/jobs/hash-uploaded-evidence", "schedule": "*/5 * * * *" },
    { "path": "/api/jobs/process-ai-jobs", "schedule": "*/5 * * * *" },
    { "path": "/api/jobs/release-stuck-jobs", "schedule": "*/15 * * * *" },
    { "path": "/api/jobs/expire-delivery-links", "schedule": "0 * * * *" },
    { "path": "/api/jobs/send-notifications", "schedule": "0 * * * *" },
    { "path": "/api/jobs/retention-review", "schedule": "0 3 * * *" },
    { "path": "/api/jobs/generate-report-pdf", "schedule": "0 3 * * *" },
    { "path": "/api/jobs/backup-audit-export", "schedule": "0 4 * * *" }
  ]
}
```

Vercel Cron envía automáticamente `Authorization: Bearer $CRON_SECRET`; los jobs
también aceptan `?secret=` para pruebas manuales.

## 6. Verificación post-despliegue

- [ ] La home carga y el tema oscuro espectral se ve correctamente.
- [ ] `POST /api/public/inquiries` responde 201 y crea el registro.
- [ ] `/consola` permite iniciar sesión con un usuario válido.
- [ ] `/consola/panel` queda protegido por el middleware.
- [ ] Cabeceras de seguridad presentes (HSTS, X-Frame-Options…).
- [ ] Los enlaces de evidencia/entrega no son públicamente accesibles.
