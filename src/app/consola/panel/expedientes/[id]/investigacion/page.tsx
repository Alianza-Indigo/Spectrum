import type { Metadata } from "next";
import { pageGuard, requireCaseAccess } from "@/lib/auth/guards";
import { canAny, type Role } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { SectionCard, EmptyState, StatusPill } from "@/components/console/ui";
import { Table, THead, TH, TBody, TR, TD } from "@/components/console/table";
import { Label, Input, Textarea, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/console/submit-button";
import { Badge } from "@/components/ui/badge";
import { confidenceLabels, reliabilityLabels } from "@/lib/status";
import { addSourceAction, addFindingAction, addTimelineEventAction } from "../../actions";

export const metadata: Metadata = { title: "Investigación", robots: { index: false, follow: false } };

const sourceTypes: [string, string][] = [
  ["CLIENT_DOCUMENT", "Documento del cliente"], ["AUTHORIZED_INTERVIEW", "Entrevista autorizada"],
  ["PUBLIC_RECORD", "Registro público"], ["PUBLIC_WEBSITE", "Sitio web público"],
  ["AUTHORIZED_COMMUNICATION", "Comunicación autorizada"], ["LAWFUL_OBSERVATION", "Observación lícita"],
  ["INSTITUTIONAL", "Fuente institucional"], ["CONFIDENTIAL", "Fuente confidencial"],
  ["PENDING_VERIFICATION", "Pendiente de verificación"],
];

export default async function CaseInvestigacionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await pageGuard("case:read_assigned");
  const { id } = await params;
  await requireCaseAccess(session, id);
  const roles = session.roles as Role[];

  const [sources, findings, timeline, evidence] = await Promise.all([
    prisma.source.findMany({ where: { caseId: id }, orderBy: { createdAt: "desc" } }),
    prisma.finding.findMany({ where: { caseId: id }, orderBy: { createdAt: "desc" }, include: { source: true, evidence: true } }),
    prisma.timelineEvent.findMany({ where: { caseId: id }, orderBy: { occurredAt: "asc" } }),
    prisma.evidenceItem.findMany({ where: { caseId: id }, select: { id: true, internalName: true } }),
  ]);

  return (
    <div className="space-y-6">
      {/* Fuentes */}
      <SectionCard title="Fuentes">
        {sources.length === 0 ? (
          <EmptyState title="Sin fuentes" />
        ) : (
          <Table>
            <THead><TR><TH>Origen</TH><TH>Tipo</TH><TH>Confiabilidad</TH><TH>Método</TH></TR></THead>
            <TBody>
              {sources.map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium text-foreground">{s.origin}</TD>
                  <TD className="text-muted">{sourceTypes.find((t) => t[0] === s.type)?.[1] ?? s.type}</TD>
                  <TD><Badge tone="cyan">{reliabilityLabels[s.reliability]}</Badge></TD>
                  <TD className="text-muted">{s.method ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        {canAny(roles, "source:write") && (
          <form action={addSourceAction} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="caseId" value={id} />
            <div>
              <Label htmlFor="origin" required>Origen</Label>
              <Input id="origin" name="origin" required />
            </div>
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select id="type" name="type" defaultValue="PUBLIC_RECORD">
                {sourceTypes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="method">Método</Label>
              <Input id="method" name="method" />
            </div>
            <div>
              <Label htmlFor="reliability">Confiabilidad</Label>
              <Select id="reliability" name="reliability" defaultValue="UNKNOWN">
                <option value="UNKNOWN">Desconocida</option><option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option><option value="HIGH">Alta</option><option value="VERIFIED">Verificada</option>
              </Select>
            </div>
            <div className="sm:col-span-2"><SubmitButton size="sm" variant="secondary">Agregar fuente</SubmitButton></div>
          </form>
        )}
      </SectionCard>

      {/* Hallazgos */}
      <SectionCard title="Hallazgos">
        <p className="mb-4 text-xs text-muted">Un hallazgo requiere al menos una fuente o evidencia asociada. Se distinguen hecho, interpretación y alternativas.</p>
        {findings.length === 0 ? (
          <EmptyState title="Sin hallazgos" />
        ) : (
          <ul className="mb-5 space-y-3">
            {findings.map((f) => (
              <li key={f.id} className="rounded-xl border border-border/60 bg-surface/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{f.observedFact}</p>
                  <Badge tone="violet">{confidenceLabels[f.confidence]}</Badge>
                </div>
                {f.interpretation && <p className="mt-1 text-sm text-muted">Interpretación: {f.interpretation}</p>}
                <p className="mt-2 text-xs text-muted">
                  Respaldo: {f.source ? `fuente «${f.source.origin}»` : ""}{f.source && f.evidence ? " · " : ""}
                  {f.evidence ? `evidencia ${f.evidence.internalName}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        {canAny(roles, "finding:write") && (
          <form action={addFindingAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="caseId" value={id} />
            <div className="sm:col-span-2">
              <Label htmlFor="observedFact" required>Hecho observado</Label>
              <Textarea id="observedFact" name="observedFact" required />
            </div>
            <div>
              <Label htmlFor="sourceId">Fuente asociada</Label>
              <Select id="sourceId" name="sourceId" defaultValue="">
                <option value="">— Ninguna —</option>
                {sources.map((s) => <option key={s.id} value={s.id}>{s.origin}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="evidenceId">Evidencia asociada</Label>
              <Select id="evidenceId" name="evidenceId" defaultValue="">
                <option value="">— Ninguna —</option>
                {evidence.map((e) => <option key={e.id} value={e.id}>{e.internalName}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="confidence">Nivel de confianza</Label>
              <Select id="confidence" name="confidence" defaultValue="MODERATE">
                <option value="SPECULATIVE">Especulativo</option><option value="LOW">Bajo</option>
                <option value="MODERATE">Moderado</option><option value="HIGH">Alto</option><option value="CORROBORATED">Corroborado</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="interpretation">Interpretación</Label>
              <Input id="interpretation" name="interpretation" />
            </div>
            <div className="sm:col-span-2"><SubmitButton size="sm">Registrar hallazgo</SubmitButton></div>
          </form>
        )}
      </SectionCard>

      {/* Línea de tiempo */}
      <SectionCard title="Línea de tiempo">
        {timeline.length === 0 ? (
          <EmptyState title="Sin eventos" />
        ) : (
          <ul className="mb-5 space-y-3">
            {timeline.map((t) => (
              <li key={t.id} className="border-l-2 border-cyan/40 pl-4">
                <p className="text-xs text-muted">
                  {t.occurredAt ? t.occurredAt.toISOString().slice(0, 10) : "Fecha desconocida"} · {t.kind === "FACT" ? "Hecho" : t.kind === "STATEMENT" ? "Declaración" : "Inferencia"}
                </p>
                <p className="text-sm text-foreground">{t.title}</p>
                {t.description && <p className="text-sm text-muted">{t.description}</p>}
              </li>
            ))}
          </ul>
        )}
        {canAny(roles, "finding:write") && (
          <form action={addTimelineEventAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="caseId" value={id} />
            <div>
              <Label htmlFor="title" required>Evento</Label>
              <Input id="title" name="title" required />
            </div>
            <div>
              <Label htmlFor="occurredAt">Fecha</Label>
              <Input id="occurredAt" name="occurredAt" type="date" />
            </div>
            <div>
              <Label htmlFor="kind">Naturaleza</Label>
              <Select id="kind" name="kind" defaultValue="FACT">
                <option value="FACT">Hecho</option><option value="STATEMENT">Declaración</option><option value="INFERENCE">Inferencia</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="precision">Precisión</Label>
              <Select id="precision" name="precision" defaultValue="EXACT">
                <option value="EXACT">Exacta</option><option value="APPROXIMATE">Aproximada</option><option value="UNKNOWN">Desconocida</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Input id="description" name="description" />
            </div>
            <div className="sm:col-span-2"><SubmitButton size="sm" variant="secondary">Agregar evento</SubmitButton></div>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
