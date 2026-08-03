import type { ReportType, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildReportPdf, type ReportSectionInput } from "@/lib/pdf/report";
import { storeObject, readObject, signDownloadUrl } from "@/lib/adapters/storage";
import { recordAudit } from "@/lib/audit";
import { requireCaseAccess, AccessError } from "@/lib/auth/guards";
import { confidentialityLabels } from "@/lib/status";
import type { SessionPayload } from "@/lib/auth/session";

/**
 * Crea un informe con su primera versión, autopoblando secciones a partir del
 * expediente (hechos, línea de tiempo, hallazgos, anexos). El generador de PDF
 * diferencia hechos, declaraciones, inferencias y conclusiones.
 */
export async function createReport(session: SessionPayload, caseId: string, type: ReportType, title: string) {
  const current = await requireCaseAccess(session, caseId);

  const [findings, timeline, evidence, plan] = await Promise.all([
    prisma.finding.findMany({ where: { caseId }, orderBy: { createdAt: "asc" } }),
    prisma.timelineEvent.findMany({ where: { caseId }, orderBy: { occurredAt: "asc" } }),
    prisma.evidenceItem.findMany({ where: { caseId, status: { in: ["VERIFIED", "ANNEXED"] } } }),
    prisma.investigationPlan.findFirst({ where: { caseId }, orderBy: { version: "desc" } }),
  ]);

  const sections: { order: number; heading: string; kind: string; body: string }[] = [
    { order: 1, heading: "Resumen ejecutivo", kind: "narrative", body: "" },
    { order: 2, heading: "Metodología autorizada", kind: "narrative", body: plan?.allowedMethods ?? "Métodos permitidos conforme al plan de investigación." },
    {
      order: 3,
      heading: "Hechos documentados",
      kind: "facts",
      body: findings.length ? findings.map((f) => `• ${f.observedFact}`).join("\n") : "Sin hechos documentados.",
    },
    {
      order: 4,
      heading: "Línea de tiempo",
      kind: "timeline",
      body: timeline.length
        ? timeline.map((t) => `• ${t.occurredAt ? t.occurredAt.toISOString().slice(0, 10) : "Fecha desconocida"} — ${t.title}`).join("\n")
        : "Sin eventos registrados.",
    },
    {
      order: 5,
      heading: "Hallazgos",
      kind: "findings",
      body: findings.length
        ? findings.map((f) => `• ${f.observedFact}${f.interpretation ? ` (interpretación: ${f.interpretation})` : ""}`).join("\n")
        : "Sin hallazgos.",
    },
    { order: 6, heading: "Conclusiones limitadas al alcance", kind: "conclusion", body: "" },
    { order: 7, heading: "Recomendaciones operativas (no jurídicas)", kind: "narrative", body: "" },
    {
      order: 8,
      heading: "Anexos y cadena de custodia",
      kind: "annex",
      body: evidence.length ? evidence.map((e) => `• ${e.internalName} — SHA-256 ${e.sha256 ?? "pendiente"}`).join("\n") : "Sin anexos.",
    },
  ];

  const report = await prisma.report.create({
    data: {
      organizationId: current.organizationId,
      caseId,
      type,
      title,
      status: "DRAFT",
      createdByUser: session.userId,
      versions: {
        create: {
          version: 1,
          createdByUser: session.userId,
          sections: { create: sections },
        },
      },
    },
    include: { versions: true },
  });

  await recordAudit({
    organizationId: current.organizationId,
    actorUserId: session.userId,
    action: "report.create",
    resourceType: "report",
    resourceId: report.id,
    metadata: { caseId, type },
  });

  return report;
}

export async function updateSection(session: SessionPayload, sectionId: string, body: string) {
  const section = await prisma.reportSection.findUnique({
    where: { id: sectionId },
    include: { reportVersion: { include: { report: true } } },
  });
  if (!section || section.reportVersion.report.organizationId !== session.organizationId) {
    throw new AccessError(404, "No encontrado.");
  }
  await requireCaseAccess(session, section.reportVersion.report.caseId);
  return prisma.reportSection.update({ where: { id: sectionId }, data: { body } });
}

/** Genera (o regenera) el PDF de la última versión y devuelve una URL firmada. */
export async function generateReportPdf(session: SessionPayload, reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      case: { include: { client: true } },
      versions: { orderBy: { version: "desc" }, take: 1, include: { sections: { orderBy: { order: "asc" } } } },
    },
  });
  if (!report || report.organizationId !== session.organizationId) throw new AccessError(404, "No encontrado.");
  await requireCaseAccess(session, report.caseId);

  const version = report.versions[0];
  if (!version) throw new AccessError(422, "El informe no tiene versiones.");

  const pdfSections: ReportSectionInput[] = version.sections.map((s) => ({ heading: s.heading, body: s.body, kind: s.kind }));

  const bytes = await buildReportPdf({
    title: report.title,
    folio: report.case.folio,
    clientName: report.case.client?.displayName ?? null,
    scope: report.case.scope,
    limitations: report.case.exclusions,
    version: version.version,
    generatedAt: new Date(),
    confidentiality: confidentialityLabels[report.case.confidentiality],
    sections: pdfSections,
  });

  const object = await storeObject({
    organizationId: report.organizationId,
    contentType: "application/pdf",
    bytes: Buffer.from(bytes),
    createdByUser: session.userId,
    keyHint: `report-${report.case.folio}-v${version.version}`,
  });

  await prisma.reportVersion.update({ where: { id: version.id }, data: { pdfStorageKey: object.id } });

  await recordAudit({
    organizationId: report.organizationId,
    actorUserId: session.userId,
    action: "report.pdf",
    resourceType: "report",
    resourceId: reportId,
    metadata: { version: version.version, sizeBytes: object.sizeBytes },
  });

  return signDownloadUrl(object, { ttlSeconds: 600, filename: `${report.case.folio}-informe-v${version.version}.pdf` });
}

export async function setReportStatus(session: SessionPayload, reportId: string, status: ReviewStatus) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || report.organizationId !== session.organizationId) throw new AccessError(404, "No encontrado.");
  await requireCaseAccess(session, report.caseId);
  const updated = await prisma.report.update({ where: { id: reportId }, data: { status } });
  await recordAudit({
    organizationId: report.organizationId,
    actorUserId: session.userId,
    action: "report.status",
    resourceType: "report",
    resourceId: reportId,
    metadata: { status },
  });
  return updated;
}

export async function getReportPdfUrlIfExists(reportVersionId: string) {
  const version = await prisma.reportVersion.findUnique({ where: { id: reportVersionId } });
  if (!version?.pdfStorageKey) return null;
  const object = await readObject(version.pdfStorageKey);
  if (!object) return null;
  return signDownloadUrl(object, { ttlSeconds: 600 });
}
