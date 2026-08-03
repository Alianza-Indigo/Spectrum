import type { Metadata } from "next";
import { pageGuard, requireCaseAccess, orgScope } from "@/lib/auth/guards";
import { canAny, roleLabels, type Role } from "@/lib/auth/rbac";
import { openRequirements } from "@/lib/services/cases";
import { prisma } from "@/lib/db";
import { SectionCard, DescList, EmptyState, StatusPill } from "@/components/console/ui";
import { Label, Input, Textarea, Select, Checkbox } from "@/components/ui/field";
import { SubmitButton } from "@/components/console/submit-button";
import { Badge } from "@/components/ui/badge";
import {
  caseStatusLabels, caseTransitions, confidentialityLabels, riskLabels, viabilityDecisionLabels,
} from "@/lib/status";
import {
  transitionCaseAction, recordViabilityAction, addAuthorizationAction, assignUserAction, savePlanAction,
} from "../actions";

export const metadata: Metadata = { title: "Expediente", robots: { index: false, follow: false } };

export default async function CaseOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const session = await pageGuard("case:read_assigned");
  const { id } = await params;
  const { msg } = await searchParams;
  await requireCaseAccess(session, id);

  const [c, members, plan] = await Promise.all([
    prisma.case.findUnique({
      where: { id },
      include: {
        client: true,
        assignments: true,
        authorizations: { orderBy: { createdAt: "desc" } },
        viabilityReviews: { orderBy: { decidedAt: "desc" } },
      },
    }),
    prisma.organizationMember.findMany({
      where: { organizationId: session.organizationId!, status: "ACTIVE" },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.investigationPlan.findFirst({ where: { caseId: id }, orderBy: { version: "desc" } }),
  ]);
  if (!c) return null;

  const roles = session.roles as Role[];
  const users = Array.from(new Map(members.map((m) => [m.user.id, m.user])).values());
  const userName = (uid: string | null) => users.find((u) => u.id === uid)?.name ?? "—";
  const transitions = caseTransitions[c.status] ?? [];
  const missing = await openRequirements(id);

  return (
    <div className="space-y-6">
      {msg && (
        <p role="alert" className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          {msg}
        </p>
      )}

      <SectionCard title="Datos del expediente">
        <DescList
          items={[
            { label: "Cliente", value: c.client?.displayName },
            { label: "Objetivo", value: c.objective },
            { label: "Alcance", value: c.scope },
            { label: "Exclusiones", value: c.exclusions },
            { label: "Jurisdicción", value: c.jurisdiction },
            { label: "Confidencialidad", value: confidentialityLabels[c.confidentiality] },
            { label: "Riesgo operativo", value: riskLabels[c.operationalRisk] },
            { label: "Riesgo legal", value: riskLabels[c.legalRisk] },
            { label: "Responsable", value: userName(c.leadUserId) },
            { label: "Apertura", value: c.openedAt?.toISOString().slice(0, 10) },
          ]}
        />
      </SectionCard>

      {/* Estado y transiciones */}
      {canAny(roles, "case:update") && (
        <SectionCard title="Estado del expediente">
          {c.status === "CONTRATADO" && missing.length > 0 && (
            <p className="mb-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              Para abrir el expediente falta: {missing.join(", ")}.
            </p>
          )}
          {transitions.length === 0 ? (
            <p className="text-sm text-muted">No hay transiciones disponibles desde este estado.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {transitions.map((to) => (
                <form key={to} action={transitionCaseAction}>
                  <input type="hidden" name="caseId" value={id} />
                  <input type="hidden" name="to" value={to} />
                  <SubmitButton size="sm" variant="secondary">→ {caseStatusLabels[to]}</SubmitButton>
                </form>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Viabilidad y compliance */}
      <SectionCard title="Evaluación de viabilidad y compliance">
        {c.viabilityReviews.length === 0 ? (
          <EmptyState title="Sin evaluaciones de viabilidad" />
        ) : (
          <ul className="mb-5 space-y-3">
            {c.viabilityReviews.map((v) => (
              <li key={v.id} className="rounded-xl border border-border/60 bg-surface/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{v.requestedObjective}</span>
                  <Badge tone={v.decision === "REJECT" || v.decision === "ESCALATE" ? "danger" : "success"}>
                    {viabilityDecisionLabels[v.decision]}
                  </Badge>
                </div>
                {v.decisionReason && <p className="mt-1 text-sm text-muted">{v.decisionReason}</p>}
              </li>
            ))}
          </ul>
        )}
        {canAny(roles, "case:viability") && (
          <form action={recordViabilityAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="caseId" value={id} />
            <div className="sm:col-span-2">
              <Label htmlFor="requestedObjective" required>Objetivo solicitado</Label>
              <Textarea id="requestedObjective" name="requestedObjective" required />
            </div>
            <div>
              <Label htmlFor="legitimateBasis">Base legítima</Label>
              <Input id="legitimateBasis" name="legitimateBasis" />
            </div>
            <div>
              <Label htmlFor="plannedSources">Fuentes previstas</Label>
              <Input id="plannedSources" name="plannedSources" />
            </div>
            <div>
              <Label htmlFor="conflictsOfInterest">Conflictos de interés</Label>
              <Input id="conflictsOfInterest" name="conflictsOfInterest" />
            </div>
            <div>
              <Label htmlFor="decision" required>Decisión</Label>
              <Select id="decision" name="decision" defaultValue="ACCEPT">
                <option value="ACCEPT">Aceptar</option>
                <option value="REQUEST_CLARIFICATION">Solicitar aclaración</option>
                <option value="ESCALATE">Escalar</option>
                <option value="REJECT">Rechazar</option>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="decisionReason">Motivo</Label>
              <Textarea id="decisionReason" name="decisionReason" />
            </div>
            <div className="sm:col-span-2">
              <Checkbox id="requiresLegalAdvice" name="requiresLegalAdvice" label="Requiere asesoría legal externa" />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton size="sm">Registrar evaluación</SubmitButton>
            </div>
          </form>
        )}
      </SectionCard>

      {/* Autorizaciones */}
      <SectionCard title="Autorizaciones y consentimientos">
        {c.authorizations.length === 0 ? (
          <EmptyState title="Sin autorizaciones registradas" hint="Necesarias para abrir el expediente." />
        ) : (
          <ul className="mb-5 space-y-2">
            {c.authorizations.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-surface/40 px-4 py-3 text-sm">
                <span className="text-foreground">{a.description}</span>
                <Badge tone="indigo">{a.kind}</Badge>
              </li>
            ))}
          </ul>
        )}
        {canAny(roles, "case:authorize") && (
          <form action={addAuthorizationAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="caseId" value={id} />
            <div>
              <Label htmlFor="kind">Tipo</Label>
              <Select id="kind" name="kind" defaultValue="consentimiento">
                <option value="consentimiento">Consentimiento</option>
                <option value="contrato">Contrato</option>
                <option value="poder">Poder / representación</option>
                <option value="base_legitima">Base legítima</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="grantedBy">Otorgada por</Label>
              <Input id="grantedBy" name="grantedBy" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description" required>Descripción</Label>
              <Input id="description" name="description" required />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton size="sm" variant="secondary">Registrar autorización</SubmitButton>
            </div>
          </form>
        )}
      </SectionCard>

      {/* Asignaciones */}
      <SectionCard title="Equipo asignado">
        <ul className="mb-5 flex flex-wrap gap-2">
          {c.assignments.map((a) => (
            <li key={a.id}>
              <StatusPill label={`${userName(a.userId)} · ${roleLabels[a.role as Role]}`} tone="indigo" />
            </li>
          ))}
          {c.assignments.length === 0 && <li className="text-sm text-muted">Sin asignaciones.</li>}
        </ul>
        {canAny(roles, "case:update") && (
          <form action={assignUserAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="caseId" value={id} />
            <div>
              <Label htmlFor="userId">Miembro</Label>
              <Select id="userId" name="userId">
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="role">Rol</Label>
              <Select id="role" name="role" defaultValue="INVESTIGATOR">
                <option value="INVESTIGATOR">Investigador</option>
                <option value="ANALYST">Analista</option>
                <option value="QUALITY_REVIEWER">Revisor de calidad</option>
                <option value="DIRECTOR">Director</option>
              </Select>
            </div>
            <SubmitButton size="sm" variant="secondary">Asignar</SubmitButton>
          </form>
        )}
      </SectionCard>

      {/* Plan de investigación */}
      {canAny(roles, "case:update") && (
        <SectionCard title="Plan de investigación">
          <form action={savePlanAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="caseId" value={id} />
            <div>
              <Label htmlFor="allowedMethods">Métodos permitidos</Label>
              <Textarea id="allowedMethods" name="allowedMethods" defaultValue={plan?.allowedMethods ?? ""} />
            </div>
            <div>
              <Label htmlFor="prohibitedMethods">Métodos prohibidos</Label>
              <Textarea id="prohibitedMethods" name="prohibitedMethods" defaultValue={plan?.prohibitedMethods ?? ""} />
            </div>
            <div>
              <Label htmlFor="authorizedSources">Fuentes autorizadas</Label>
              <Textarea id="authorizedSources" name="authorizedSources" defaultValue={plan?.authorizedSources ?? ""} />
            </div>
            <div>
              <Label htmlFor="sufficiencyCriteria">Criterios de suficiencia</Label>
              <Textarea id="sufficiencyCriteria" name="sufficiencyCriteria" defaultValue={plan?.sufficiencyCriteria ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="risksAndControls">Riesgos y controles</Label>
              <Textarea id="risksAndControls" name="risksAndControls" defaultValue={plan?.risksAndControls ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton size="sm">Guardar plan</SubmitButton>
            </div>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
