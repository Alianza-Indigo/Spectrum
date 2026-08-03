import type { Metadata } from "next";
import { pageGuard, requireCaseAccess } from "@/lib/auth/guards";
import { canAny, type Role } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { SectionCard, EmptyState } from "@/components/console/ui";
import { Label, Textarea, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/console/submit-button";
import { Badge } from "@/components/ui/badge";
import { runAiAction, reviewAiOutputAction } from "../../actions";

export const metadata: Metadata = { title: "IA asistida", robots: { index: false, follow: false } };

const opLabels: Record<string, string> = {
  summarize: "Resumen", analyze: "Análisis", extract_entities: "Extracción de entidades",
  timeline: "Línea de tiempo", questions: "Preguntas de investigación",
};
const reviewTone: Record<string, "neutral" | "warning" | "success" | "danger"> = {
  PENDING_HUMAN_REVIEW: "warning", REVIEWED: "neutral", ACCEPTED: "success", REJECTED: "danger",
};
const reviewLabel: Record<string, string> = {
  PENDING_HUMAN_REVIEW: "Pendiente de revisión", REVIEWED: "Revisado", ACCEPTED: "Aceptado", REJECTED: "Rechazado",
};

export default async function CaseIaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await pageGuard("case:read_assigned");
  const { id } = await params;
  await requireCaseAccess(session, id);
  const roles = session.roles as Role[];

  const runs = await prisma.aiRun.findMany({
    where: { caseId: id },
    orderBy: { createdAt: "desc" },
    include: { outputs: true },
    take: 30,
  });

  return (
    <div className="space-y-6">
      <SectionCard title="Investigación asistida por IA">
        <p className="mb-4 text-xs text-muted">
          La IA asiste el análisis y produce borradores que requieren revisión humana. No afirma delitos, no identifica
          personas ni presenta inferencias como hechos. Cada ejecución registra proveedor, modelo y versión de prompt.
        </p>
        {canAny(roles, "ai:run") && (
          <form action={runAiAction} className="grid gap-3">
            <input type="hidden" name="caseId" value={id} />
            <div>
              <Label htmlFor="operation">Operación</Label>
              <Select id="operation" name="operation" defaultValue="summarize">
                {Object.entries(opLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="input" required>Material (texto a analizar)</Label>
              <Textarea id="input" name="input" required placeholder="Pega aquí las notas o el texto a analizar. La IA no accede a datos externos." />
            </div>
            <div><SubmitButton size="sm">Ejecutar IA</SubmitButton></div>
          </form>
        )}
      </SectionCard>

      <SectionCard title="Resultados de IA">
        {runs.length === 0 ? (
          <EmptyState title="Sin ejecuciones de IA" />
        ) : (
          <ul className="space-y-4">
            {runs.map((r) => (
              <li key={r.id} className="rounded-xl border border-border/60 bg-surface/40 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Badge tone="indigo">{opLabels[r.operation] ?? r.operation}</Badge>
                  <span>{r.provider} · {r.model} · {r.promptVersion}</span>
                  <span>{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
                </div>
                {r.outputs.map((o) => (
                  <div key={o.id} className="mt-2 border-t border-border/50 pt-3">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{o.content}</pre>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge tone={reviewTone[o.reviewStatus]}>{reviewLabel[o.reviewStatus]}</Badge>
                      {o.isDraft && <Badge tone="warning">Borrador</Badge>}
                      {canAny(roles, "ai:review") && o.reviewStatus === "PENDING_HUMAN_REVIEW" && (
                        <>
                          <form action={reviewAiOutputAction}>
                            <input type="hidden" name="caseId" value={id} />
                            <input type="hidden" name="outputId" value={o.id} />
                            <input type="hidden" name="status" value="ACCEPTED" />
                            <SubmitButton size="sm" variant="ghost">Aceptar</SubmitButton>
                          </form>
                          <form action={reviewAiOutputAction}>
                            <input type="hidden" name="caseId" value={id} />
                            <input type="hidden" name="outputId" value={o.id} />
                            <input type="hidden" name="status" value="REJECTED" />
                            <SubmitButton size="sm" variant="ghost">Rechazar</SubmitButton>
                          </form>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {r.warnings && <p className="mt-2 text-xs text-warning">{r.warnings}</p>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
