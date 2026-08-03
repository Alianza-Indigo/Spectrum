# SPECTRUM · Agencia de Inteligencia

Plataforma web profesional para administrar de extremo a extremo investigaciones
privadas, inteligencia corporativa, verificaciones, debida diligencia y análisis
documental — organizando **información obtenida lícitamente**, con documentación
de fuentes, preservación de evidencia, control de accesos e informes auditables.

> SPECTRUM **no** es una herramienta de espionaje ni de acceso clandestino. Su
> función es organizar información lícita, documentar fuentes, preservar
> evidencia, administrar tareas, controlar accesos y entregar informes
> profesionales auditables.

Este repositorio implementa la **base de producto (Fases 0–1)** definida en el
PRD, más el **modelo de datos completo** y la arquitectura para las fases
siguientes.

---

## Estado por fases

| Fase | Alcance | Estado |
|------|---------|--------|
| **0** | Marca, arquitectura y seguridad base | ✅ Implementado |
| **1** | Sitio público, solicitudes y autenticación | ✅ Implementado |
| 2 | Clientes, expedientes, permisos y tareas | 🧱 Modelo de datos + RBAC listos |
| 3 | Fuentes, hallazgos, línea de tiempo y evidencia | 🧱 Modelo de datos listo |
| 4 | Informes, revisión, PDF y portal cliente | 🧱 Modelo de datos listo |
| 5 | IA asistida, búsqueda y análisis documental | 🧱 Modelo de datos listo |
| 6 | Auditoría, retención, métricas y operación | 🧱 Auditoría base implementada |
| 7 | Facturación, automatizaciones e integraciones | 🧱 Modelo de datos listo |

### Qué funciona hoy

- **Sitio público** premium (tema oscuro espectral, accesible AA, responsive):
  inicio, servicios, metodología, FAQ y aviso legal.
- **Formulario de solicitud** → `POST /api/public/inquiries` con validación
  (Zod), rate limiting, **screening de cumplimiento** (bloquea/triage de
  solicitudes que impliquen métodos prohibidos), honeypot anti-spam y
  **registro de auditoría**.
- **Autenticación** de consola: sesiones firmadas (HMAC), contraseñas con
  scrypt, middleware de protección de rutas y **RBAC** de 7 roles.
- **Consola** con panel de control por rol (métricas operativas) y shell de
  navegación por módulos.
- **Modelo de datos** completo (~40 tablas) con multi-tenancy, cadena de
  custodia de evidencia, IA auditable y retención.
- **24 pruebas unitarias** (RBAC, cumplimiento, folio, contraseñas, validación).

---

## Stack técnico

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (estricto)
- **Tailwind CSS** — sistema de diseño SPECTRUM por variables CSS (tema oscuro
  principal, claro opcional)
- **PostgreSQL** vía **Prisma** ORM
- **Zod** para validación · **Vitest** para pruebas
- Diseñado para **Vercel** (sin procesos residentes ni filesystem persistente)

---

## Puesta en marcha

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
#   Completa al menos DATABASE_URL y AUTH_SECRET (openssl rand -base64 32)

# 3. Esquema de base de datos
npm run db:push        # o: npm run db:migrate

# 4. Datos de demostración (no sensibles)
npm run db:seed
#   Crea usuarios demo:
#     director@spectrum.demo   / spectrum-demo
#     investigador@spectrum.demo / spectrum-demo

# 5. Desarrollo
npm run dev            # http://localhost:3000
```

### Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (`prisma generate` + `next build`) |
| `npm run start` | Servir el build |
| `npm run test` | Pruebas unitarias (Vitest) |
| `npm run typecheck` | Verificación de tipos |
| `npm run db:push` | Sincroniza el esquema con la BD |
| `npm run db:migrate` | Crea/aplica migraciones |
| `npm run db:seed` | Carga datos de demostración |

---

## Estructura

```
prisma/
  schema.prisma        Modelo de datos (~40 tablas, multi-tenant)
  seed.ts              Datos de demostración no sensibles
src/
  app/
    (site)/            Sitio público (inicio, servicios, metodología, solicitud, aviso legal)
    consola/           Acceso + consola autenticada (panel de control)
    api/public/        Endpoints públicos (solicitudes)
  components/          UI (design system), sitio y fondo espectral
  config/              Contenido y navegación del sitio
  lib/
    auth/              RBAC, sesiones, contraseñas, usuario actual
    validation/        Esquemas Zod
    audit.ts           Registro de auditoría
    compliance.ts      Screening de métodos prohibidos
    db.ts, folio.ts, rate-limit.ts, utils.ts
  middleware.ts        Protección de rutas de consola
tests/                 Pruebas unitarias (Vitest)
docs/                  Arquitectura, seguridad, despliegue y permisos
```

---

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — arquitectura técnica, modelo de datos y jobs.
- [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) — seguridad, retención y cumplimiento.
- [`docs/MODELO_PERMISOS.md`](docs/MODELO_PERMISOS.md) — roles y matriz de permisos (RBAC).
- [`docs/DESPLIEGUE_VERCEL.md`](docs/DESPLIEGUE_VERCEL.md) — despliegue en Vercel.

---

## Principios de operación

Legalidad y autorización documentada · separación entre hechos, fuentes,
inferencias y conclusiones · mínimo acceso necesario · privacidad por diseño ·
cadena de custodia verificable · toda acción sensible es auditable · la IA
asiste el análisis pero **no** decide culpabilidad ni identidad · la plataforma
funciona incluso con las integraciones de IA desactivadas.
