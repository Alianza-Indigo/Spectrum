# SPECTRUM · Agencia de Inteligencia

Plataforma web profesional para administrar de extremo a extremo investigaciones
privadas, inteligencia corporativa, verificaciones, debida diligencia y análisis
documental — organizando **información obtenida lícitamente**, con documentación
de fuentes, preservación de evidencia, control de accesos e informes auditables.

> SPECTRUM **no** es una herramienta de espionaje ni de acceso clandestino. Su
> función es organizar información lícita, documentar fuentes, preservar
> evidencia, administrar tareas, controlar accesos y entregar informes
> profesionales auditables.

Este repositorio implementa la plataforma **completa** definida en el PRD
(Fases 0–7): sitio público, consola operativa de extremo a extremo, IA asistida,
informes en PDF, entrega controlada, API REST, jobs y auditoría.

---

## Estado por fases

| Fase | Alcance | Estado |
|------|---------|--------|
| **0** | Marca, arquitectura y seguridad base | ✅ Completo |
| **1** | Sitio público, solicitudes y autenticación | ✅ Completo |
| **2** | Clientes, expedientes, permisos y tareas | ✅ Completo |
| **3** | Fuentes, hallazgos, línea de tiempo y evidencia | ✅ Completo |
| **4** | Informes, revisión, PDF y portal cliente | ✅ Completo |
| **5** | IA asistida y análisis documental | ✅ Completo |
| **6** | Auditoría, retención, métricas y operación | ✅ Completo |
| **7** | Facturación operativa y jobs/automatizaciones | ✅ Completo |

### Capacidades

- **Sitio público** premium (tema oscuro espectral, accesible AA, responsive):
  inicio, servicios, metodología, FAQ, aviso legal y formulario de solicitud
  (`POST /api/public/inquiries`) con validación, rate limiting, **screening de
  cumplimiento**, honeypot y auditoría.
- **Autenticación y RBAC**: sesiones firmadas (HMAC), contraseñas scrypt,
  middleware de protección y 7 roles con permisos por recurso; el investigador
  solo ve expedientes asignados (anti-IDOR).
- **Expedientes de extremo a extremo**: alta, evaluación de viabilidad con
  compliance, autorizaciones, **máquina de estados** (no se abre sin cliente,
  alcance, responsable y autorización), plan de investigación, tareas y línea de
  actividades inmutable.
- **Inteligencia**: fuentes y hallazgos con invariante hecho↔fuente, línea de
  tiempo, y **evidencia con hash SHA-256, cadena de custodia y descarga privada
  firmada**.
- **IA asistida** con proveedor Anthropic o modo local autocontenido; toda
  salida es un borrador con **revisión humana obligatoria** y registro auditable.
- **Informes en PDF** (pdf-lib) que diferencian hechos/inferencias/conclusiones,
  con versiones y flujo de revisión; **entrega controlada** por enlace expirable
  y revocable, y **portal público** del cliente.
- **Comunicaciones** (interno/cliente), **facturación operativa** (presupuesto,
  tiempos, gastos), **administración** (usuarios, roles, retención) y **visor de
  auditoría**.
- **API REST** completa del PRD y **8 jobs** cron protegidos con `CRON_SECRET`.
- **Almacenamiento privado autocontenido** con URLs firmadas; adaptadores de
  correo e IA con modo por defecto sin credenciales externas.
- **32 pruebas** (RBAC, cumplimiento, folio, contraseñas, validación, máquina de
  estados, PDF, firma de tokens). Build de producción verde.

> **Servicios externos:** almacenamiento, correo e IA usan adaptadores con un
> modo por defecto **autocontenido y funcional** (sin credenciales). Al
> configurar `STORAGE_*`, `EMAIL_*` o `ANTHROPIC_API_KEY` se conmutan a los
> proveedores externos sin cambios de código.

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
#   Crea usuarios demo (contraseña: spectrum-demo):
#     director@spectrum.demo        (Director)
#     investigador@spectrum.demo    (Investigador)
#     admin@spectrum.demo           (Administrador)
#   e incluye un expediente con viabilidad, plan, fuente, hallazgo,
#   línea de tiempo, presupuesto y una solicitud pública.

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
  schema.prisma        Modelo de datos (multi-tenant) + almacenamiento privado
  seed.ts              Datos de demostración no sensibles
src/
  app/
    (site)/            Sitio público
    (portal)/          Portal de entrega al cliente (enlace con token)
    consola/           Acceso + consola autenticada
      panel/           Panel, expedientes, clientes, tareas, auditoría, administración
    api/               API REST (public, cases, reports, deliveries, storage, jobs…)
  components/          UI (design system), sitio, consola y fondo espectral
  config/              Contenido y navegación del sitio
  lib/
    auth/              RBAC, sesiones, contraseñas, guards (anti-IDOR)
    adapters/          storage (privado), email, ai (intercambiables)
    services/          Lógica de negocio con invariantes (cases, evidence, reports…)
    pdf/               Generación de informes PDF (pdf-lib)
    validation/        Esquemas Zod
    audit.ts, compliance.ts, status.ts, signing.ts, db.ts, folio.ts, rate-limit.ts
  middleware.ts        Protección de rutas de consola
tests/                 Pruebas (Vitest)
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
