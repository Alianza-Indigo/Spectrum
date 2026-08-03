/**
 * Datos de demostración NO sensibles para SPECTRUM.
 * Ejecuta con: npm run db:seed  (requiere DATABASE_URL configurada).
 *
 * Nota: los usuarios se crean sin contraseña real; en producción el alta de
 * usuarios pasa por el flujo de invitación/credenciales del administrador.
 */
import {
  PrismaClient, Role, ClientType, CaseType, CaseStatus, TaskStatus, TaskPriority,
  SourceType, Reliability, ConfidenceLevel, TimelineKind,
} from "@prisma/client";
import { generateFolio } from "../src/lib/folio";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

// Credenciales del administrador inicial. En Vercel deben configurarse como
// ADMIN_EMAIL y ADMIN_PASSWORD; el fallback conserva la demostración local.
// TEMPORAL: fallback de prueba solicitado para validar el acceso inicial.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "nodematik@gmail.com").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? process.env.SEED_DEMO_PASSWORD ?? "pass1234";
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "spectrum-demo";

if (process.env.NODE_ENV === "production" && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
  throw new Error("En producción debes configurar ADMIN_EMAIL y ADMIN_PASSWORD.");
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "spectrum-demo" },
    update: {},
    create: {
      name: "SPECTRUM (Demo)",
      slug: "spectrum-demo",
      legalName: "SPECTRUM Agencia de Inteligencia — Entorno de Demostración",
      timezone: "America/Mexico_City",
    },
  });

  const demoPasswordHash = hashPassword(DEMO_PASSWORD);
  const adminPasswordHash = hashPassword(ADMIN_PASSWORD);

  const director = await prisma.user.upsert({
    where: { email: "director@spectrum.demo" },
    update: { passwordHash: demoPasswordHash },
    create: {
      email: "director@spectrum.demo",
      name: "Dirección de Agencia",
      organizationId: org.id,
      isActive: true,
      passwordHash: demoPasswordHash,
    },
  });

  const investigator = await prisma.user.upsert({
    where: { email: "investigador@spectrum.demo" },
    update: { passwordHash: demoPasswordHash },
    create: {
      email: "investigador@spectrum.demo",
      name: "Investigador de Campo",
      organizationId: org.id,
      isActive: true,
      passwordHash: demoPasswordHash,
    },
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId_role: { organizationId: org.id, userId: director.id, role: Role.DIRECTOR } },
    update: {},
    create: { organizationId: org.id, userId: director.id, role: Role.DIRECTOR },
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId_role: { organizationId: org.id, userId: investigator.id, role: Role.INVESTIGATOR } },
    update: {},
    create: { organizationId: org.id, userId: investigator.id, role: Role.INVESTIGATOR },
  });

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash: adminPasswordHash },
    create: { email: ADMIN_EMAIL, name: "Administración", organizationId: org.id, isActive: true, passwordHash: adminPasswordHash },
  });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId_role: { organizationId: org.id, userId: admin.id, role: Role.ADMIN } },
    update: {},
    create: { organizationId: org.id, userId: admin.id, role: Role.ADMIN },
  });

  // Datos de demostración del expediente (idempotente: solo si aún no existe).
  const existingCase = await prisma.case.findFirst({ where: { organizationId: org.id } });
  if (existingCase) {
    console.log("Seed: datos demo ya presentes; se omite la recreación.");
    console.log(`Administrador inicial: ${ADMIN_EMAIL}`);
    return;
  }

  const client = await prisma.client.create({
    data: {
      organizationId: org.id,
      type: ClientType.COMPANY,
      displayName: "Corporativo Ejemplo, S.A.",
      status: "ACTIVE",
      tags: ["corporativo", "demo"],
      contacts: {
        create: {
          name: "Contacto Autorizado",
          role: "Dirección Jurídica",
          email: "juridico@corporativo.demo",
          isAuthorized: true,
          isPrimary: true,
        },
      },
    },
  });

  const investigation = await prisma.case.create({
    data: {
      organizationId: org.id,
      folio: generateFolio(),
      internalName: "Debida diligencia proveedor estratégico",
      clientId: client.id,
      type: CaseType.DUE_DILIGENCE,
      description: "Verificación reputacional y societaria de un proveedor con información lícita y autorizada.",
      objective: "Confirmar existencia legal, historial público y riesgos reputacionales del proveedor.",
      scope: "Registros públicos, información proporcionada por el cliente y fuentes abiertas.",
      exclusions: "Sin vigilancia, sin acceso a comunicaciones privadas, sin datos restringidos.",
      jurisdiction: "MX",
      status: CaseStatus.EN_INVESTIGACION,
      leadUserId: director.id,
      budgetAmount: "45000.00",
      authorizedHours: "60.00",
      openedAt: new Date(),
      assignments: {
        create: [
          { userId: director.id, role: Role.DIRECTOR },
          { userId: investigator.id, role: Role.INVESTIGATOR },
        ],
      },
      tasks: {
        create: [
          {
            organizationId: org.id,
            title: "Consultar registro público de comercio",
            assigneeUserId: investigator.id,
            priority: TaskPriority.HIGH,
            status: TaskStatus.EN_PROGRESO,
            authorizedMethod: "Consulta de registro público",
            expectedEvidence: "Constancia o captura archivada del registro",
          },
          {
            organizationId: org.id,
            title: "Revisar información societaria proporcionada por el cliente",
            assigneeUserId: investigator.id,
            priority: TaskPriority.MEDIUM,
            status: TaskStatus.ASIGNADA,
          },
        ],
      },
    },
  });

  // Autorización, viabilidad y plan
  await prisma.caseAuthorization.create({
    data: {
      caseId: investigation.id,
      kind: "consentimiento",
      description: "Consentimiento del cliente para investigar al proveedor con información lícita.",
      grantedBy: "Dirección Jurídica del cliente",
      recordedByUser: director.id,
    },
  });
  await prisma.viabilityReview.create({
    data: {
      caseId: investigation.id,
      requestedObjective: "Confirmar existencia legal y riesgos reputacionales del proveedor.",
      legitimateBasis: "Relación comercial vigente y consentimiento del cliente.",
      plannedSources: "Registros públicos y fuentes abiertas.",
      decision: "ACCEPT",
      decisionReason: "Objetivo lícito, con base legítima y métodos permitidos.",
      decidedByUser: director.id,
    },
  });
  const plan = await prisma.investigationPlan.create({
    data: {
      caseId: investigation.id,
      version: 1,
      allowedMethods: "Consulta de registros públicos, fuentes abiertas y documentación del cliente.",
      prohibitedMethods: "Vigilancia, intrusión, interceptación, suplantación.",
      authorizedSources: "Registro público de comercio, sitios oficiales.",
      sufficiencyCriteria: "Al menos dos fuentes concordantes por hecho clave.",
      createdByUser: director.id,
    },
  });
  await prisma.investigationQuestion.create({
    data: { planId: plan.id, question: "¿El proveedor está legalmente constituido y vigente?", isHypothesis: false },
  });

  // Fuente + hallazgo (respeta la invariante hecho↔fuente)
  const source = await prisma.source.create({
    data: {
      organizationId: org.id,
      caseId: investigation.id,
      type: SourceType.PUBLIC_RECORD,
      origin: "Registro Público de Comercio (consulta en línea)",
      method: "Consulta pública",
      responsible: "Investigador de Campo",
      reliability: Reliability.HIGH,
      reference: "Folio mercantil de ejemplo",
    },
  });
  await prisma.finding.create({
    data: {
      organizationId: org.id,
      caseId: investigation.id,
      observedFact: "El proveedor aparece constituido y vigente según el registro público consultado.",
      sourceId: source.id,
      confidence: ConfidenceLevel.HIGH,
      interpretation: "Compatible con una empresa legalmente establecida.",
      createdByUser: investigator.id,
    },
  });
  await prisma.timelineEvent.create({
    data: {
      organizationId: org.id,
      caseId: investigation.id,
      title: "Constitución de la empresa proveedora (según registro público)",
      occurredAt: new Date("2018-05-14"),
      kind: TimelineKind.FACT,
    },
  });
  await prisma.activity.create({
    data: {
      organizationId: org.id,
      caseId: investigation.id,
      authorUserId: investigator.id,
      kind: "consulta",
      content: "Se consultó el registro público de comercio y se archivó la constancia.",
    },
  });
  await prisma.budget.create({
    data: { organizationId: org.id, caseId: investigation.id, amount: "45000.00", currency: "MXN", paymentStatus: "PARTIAL" },
  });

  await prisma.inquiry.create({
    data: {
      name: "Solicitante de Ejemplo",
      organizationName: "Empresa Prospecto",
      email: "prospecto@ejemplo.demo",
      serviceType: "due_diligence",
      country: "MX",
      summary: "Requerimos una debida diligencia de un socio comercial potencial.",
      urgency: "NORMAL",
      relationship: "Representante legal de la empresa solicitante",
      authorizationConfirmed: true,
      contactConsent: true,
    },
  });

  console.log("Seed completado:", { org: org.slug, caso: investigation.folio });
  console.log(`Administrador inicial: ${ADMIN_EMAIL}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
