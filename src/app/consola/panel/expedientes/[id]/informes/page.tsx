import type { Metadata } from "next";
import { pageGuard, requireCaseAccess } from "@/lib/auth/guards";
import { canAny, type Role } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { SectionCard, EmptyState, StatusPill } from "@/components/console/ui";
import { Label, Input, Select, Checkbox } from "@/components/ui/field";
import { SubmitButton } from "@/components/console/submit-button";
import { Badge } from "@/components/ui/badge";
import {
  reviewStatusLabels, reviewStatusTone, deliveryStatusLabels, deliveryStatusTone,
} from "@/lib/status";
import {
  createReportAction, generateReportPdfAction, setReportStatusAction,
  createDeliveryAction, createAccessLinkAction, revokeDeliveryAction,
} from "../../actions";

export const metadata: Metadata = { title: "Informes", robots: { index: false, follow: false } };

const reportTypes: [string, string][] = [
  ["EXECUTIVE", "Informe ejecutivo"], ["DUE_DILIGENCE", "Debida diligencia"], ["CORPORATE", "Corporativo"],
  ["DOCUMENT_INVESTIGATION", "Investigación documental"], ["LOCATION", "Localización"],
  ["FINDINGS", "Hallazgos"], ["WITH_ANNEXES", "Con anexos y cadena de custodia"],
];

export default async function CaseInformesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await pageGuard("case:read_assigned");
  const { id } = await params;
  await requireCaseAccess(session, id);
  const roles = session.roles as Role[];

  const [reports, deliveries] = await Promise.all([
    prisma.report.findMany({ where: { caseId: id }, orderBy: { createdAt: "desc" }, include: { versions: { orderBy: { version: "desc" } } } }),
    prisma.delivery.findMany({ where: { caseId: id }, orderBy: { createdAt: "desc" }, include: { access: true, report: { select: { title: true } } } }),
  ]);

  return (
    <div className="space-y-6">
      <SectionCard title="Informes">
        <p className="mb-4 text-xs text-muted">
          El informe diferencia hechos, declaraciones, inferencias y conclusiones. El PDF se genera con portada,
          control de versión y declaración de uso confidencial.
        </p>
        {reports.length === 0 ? (
          <EmptyState title="Sin informes" />
        ) : (
          <ul className="mb-5 space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl border border-border/60 bg-surface/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    <p className="text-xs text-muted">{reportTypes.find((t) => t[0] === r.type)?.[1] ?? r.type} · v{r.versions[0]?.version ?? 1}</p>
                  </div>
                  <StatusPill label={reviewStatusLabels[r.status]} tone={reviewStatusTone[r.status]} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {canAny(roles, "report:write") && (
                    <form action={generateReportPdfAction}>
                      <input type="hidden" name="reportId" value={r.id} />
                      <SubmitButton size="sm" variant="secondary">Generar / descargar PDF</SubmitButton>
                    </form>
                  )}
                  {canAny(roles, "report:write") && r.status === "DRAFT" && (
                    <form action={setReportStatusAction}>
                      <input type="hidden" name="caseId" value={id} />
                      <input type="hidden" name="reportId" value={r.id} />
                      <input type="hidden" name="status" value="IN_REVIEW" />
                      <SubmitButton size="sm" variant="ghost">Enviar a revisión</SubmitButton>
                    </form>
                  )}
                  {canAny(roles, "report:review") && r.status === "IN_REVIEW" && (
                    <>
                      <form action={setReportStatusAction}>
                        <input type="hidden" name="caseId" value={id} />
                        <input type="hidden" name="reportId" value={r.id} />
                        <input type="hidden" name="status" value="APPROVED" />
                        <SubmitButton size="sm" variant="ghost">Aprobar</SubmitButton>
                      </form>
                      <form action={setReportStatusAction}>
                        <input type="hidden" name="caseId" value={id} />
                        <input type="hidden" name="reportId" value={r.id} />
                        <input type="hidden" name="status" value="NEEDS_CHANGES" />
                        <SubmitButton size="sm" variant="ghost">Requiere cambios</SubmitButton>
                      </form>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {canAny(roles, "report:write") && (
          <form action={createReportAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="caseId" value={id} />
            <div>
              <Label htmlFor="title" required>Título del informe</Label>
              <Input id="title" name="title" required defaultValue="Informe de investigación" />
            </div>
            <div>
              <Label htmlFor="type">Plantilla</Label>
              <Select id="type" name="type" defaultValue="DUE_DILIGENCE">
                {reportTypes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </div>
            <div className="sm:col-span-2"><SubmitButton size="sm">Crear informe</SubmitButton></div>
          </form>
        )}
      </SectionCard>

      {/* Entregas */}
      <SectionCard title="Entrega controlada al cliente">
        {deliveries.length === 0 ? (
          <EmptyState title="Sin entregas" hint="Prepara una entrega a partir de un informe aprobado." />
        ) : (
          <ul className="mb-5 space-y-3">
            {deliveries.map((d) => (
              <li key={d.id} className="rounded-xl border border-border/60 bg-surface/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.report?.title ?? "Entrega"}</p>
                    <p className="text-xs text-muted">
                      {d.expiresAt ? `Expira ${d.expiresAt.toISOString().slice(0, 10)}` : "Sin expiración"} · {d.access.length} enlace(s)
                    </p>
                  </div>
                  <StatusPill label={deliveryStatusLabels[d.status]} tone={deliveryStatusTone[d.status]} />
                </div>
                {d.access.map((a) => (
                  <p key={a.id} className="mt-2 break-all font-mono text-xs text-cyan">/entrega/{a.token}</p>
                ))}
                {canAny(roles, "delivery:manage") && d.status !== "REVOKED" && (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <form action={createAccessLinkAction} className="flex items-end gap-2">
                      <input type="hidden" name="caseId" value={id} />
                      <input type="hidden" name="deliveryId" value={d.id} />
                      <div>
                        <Label htmlFor={`rcpt-${d.id}`}>Destinatario</Label>
                        <Input id={`rcpt-${d.id}`} name="recipient" placeholder="correo@cliente" className="h-9" />
                      </div>
                      <SubmitButton size="sm" variant="secondary">Generar enlace</SubmitButton>
                    </form>
                    <form action={revokeDeliveryAction}>
                      <input type="hidden" name="caseId" value={id} />
                      <input type="hidden" name="deliveryId" value={d.id} />
                      <SubmitButton size="sm" variant="ghost">Revocar</SubmitButton>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {canAny(roles, "delivery:manage") && reports.length > 0 && (
          <form action={createDeliveryAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="caseId" value={id} />
            <div>
              <Label htmlFor="reportId">Informe a entregar</Label>
              <Select id="reportId" name="reportId">
                {reports.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="expiresAt">Expiración del enlace</Label>
              <Input id="expiresAt" name="expiresAt" type="date" />
            </div>
            <div>
              <Label htmlFor="watermark">Marca de agua</Label>
              <Input id="watermark" name="watermark" placeholder="Confidencial — Cliente" />
            </div>
            <div className="flex items-end">
              <Checkbox id="requireMfa" name="requireMfa" label="Requerir MFA para acceder" />
            </div>
            <div className="sm:col-span-2"><SubmitButton size="sm">Preparar entrega</SubmitButton></div>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
