/**
 * Datos de demostración NO sensibles para SPECTRUM.
 * Ejecuta con: npm run db:seed  (requiere DATABASE_URL configurada).
 *
 * Nota: los usuarios se crean sin contraseña real; en producción el alta de
 * usuarios pasa por el flujo de invitación/credenciales del administrador.
 */
import { PrismaClient, Role, ClientType, CaseType, CaseStatus, TaskStatus, TaskPriority } from "@prisma/client";
import { generateFolio } from "../src/lib/folio";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

// Contraseña de demostración (solo para el entorno de ejemplo).
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "spectrum-demo";

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

  const passwordHash = hashPassword(DEMO_PASSWORD);

  const director = await prisma.user.upsert({
    where: { email: "director@spectrum.demo" },
    update: { passwordHash },
    create: {
      email: "director@spectrum.demo",
      name: "Dirección de Agencia",
      organizationId: org.id,
      isActive: true,
      passwordHash,
    },
  });

  const investigator = await prisma.user.upsert({
    where: { email: "investigador@spectrum.demo" },
    update: { passwordHash },
    create: {
      email: "investigador@spectrum.demo",
      name: "Investigador de Campo",
      organizationId: org.id,
      isActive: true,
      passwordHash,
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
  console.log(`Usuarios demo: director@spectrum.demo / investigador@spectrum.demo (contraseña: ${DEMO_PASSWORD})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
