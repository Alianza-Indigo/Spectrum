import type { Metadata } from "next";
import { pageGuard, requireCaseAccess } from "@/lib/auth/guards";
import { canAny, type Role } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { SectionCard, EmptyState } from "@/components/console/ui";
import { Table, THead, TH, TBody, TR, TD } from "@/components/console/table";
import { Label, Input, Textarea, Select, Checkbox } from "@/components/ui/field";
import { SubmitButton } from "@/components/console/submit-button";
import { Badge } from "@/components/ui/badge";
import { paymentStatusLabels } from "@/lib/status";
import { addMessageAction, answerRfiAction, setBudgetAction, addExpenseAction } from "../../actions";

export const metadata: Metadata = { title: "Gestión", robots: { index: false, follow: false } };

export default async function CaseGestionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await pageGuard("case:read_assigned");
  const { id } = await params;
  await requireCaseAccess(session, id);
  const roles = session.roles as Role[];

  const [messages, rfis, budget, expenses, timeAgg] = await Promise.all([
    prisma.message.findMany({ where: { caseId: id }, orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.requestForInformation.findMany({ where: { caseId: id }, orderBy: { createdAt: "desc" } }),
    prisma.budget.findFirst({ where: { caseId: id }, orderBy: { createdAt: "desc" } }),
    prisma.expense.findMany({ where: { caseId: id }, orderBy: { createdAt: "desc" } }),
    prisma.timeEntry.aggregate({ where: { caseId: id }, _sum: { hours: true } }),
  ]);

  return (
    <div className="space-y-6">
      {/* Comunicaciones */}
      <SectionCard title="Comunicaciones">
        <p className="mb-4 text-xs text-muted">Los mensajes internos no se comparten con el cliente. Elige la audiencia con cuidado.</p>
        {messages.length === 0 ? (
          <EmptyState title="Sin mensajes" />
        ) : (
          <ul className="mb-5 space-y-2">
            {messages.map((m) => (
              <li key={m.id} className="rounded-xl border border-border/60 bg-surface/40 px-4 py-3">
                <div className="flex items-center justify-between">
                  <Badge tone={m.audience === "client" ? "cyan" : "neutral"}>{m.audience === "client" ? "Cliente" : "Interno"}</Badge>
                  <span className="text-xs text-muted">{m.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
                </div>
                <p className="mt-1 text-sm text-foreground">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
        <form action={addMessageAction} className="grid gap-3">
          <input type="hidden" name="caseId" value={id} />
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="audience">Audiencia</Label>
              <Select id="audience" name="audience" defaultValue="internal">
                <option value="internal">Interno</option>
                <option value="client">Cliente</option>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor="body" required>Mensaje</Label>
              <Input id="body" name="body" required />
            </div>
          </div>
          <div><SubmitButton size="sm">Enviar mensaje</SubmitButton></div>
        </form>
      </SectionCard>

      {/* Solicitudes de información */}
      <SectionCard title="Solicitudes de información (RFI)">
        {rfis.length === 0 ? (
          <EmptyState title="Sin solicitudes" />
        ) : (
          <ul className="space-y-2">
            {rfis.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-surface/40 px-4 py-3">
                <div>
                  <p className="text-sm text-foreground">{r.title}</p>
                  {r.detail && <p className="text-xs text-muted">{r.detail}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={r.status === "answered" ? "success" : "warning"}>{r.status === "answered" ? "Respondida" : "Abierta"}</Badge>
                  {r.status !== "answered" && (
                    <form action={answerRfiAction}>
                      <input type="hidden" name="caseId" value={id} />
                      <input type="hidden" name="rfiId" value={r.id} />
                      <SubmitButton size="sm" variant="ghost">Marcar respondida</SubmitButton>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Facturación operativa */}
      {canAny(roles, "case:update") && (
        <SectionCard title="Facturación operativa">
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-surface/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted">Presupuesto</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {budget ? `${Number(budget.amount).toLocaleString()} ${budget.currency}` : "—"}
              </p>
              {budget && <Badge tone="indigo">{paymentStatusLabels[budget.paymentStatus]}</Badge>}
            </div>
            <div className="rounded-xl border border-border/60 bg-surface/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted">Horas registradas</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{Number(timeAgg._sum.hours ?? 0).toFixed(1)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-surface/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted">Gastos</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {expenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString()} {expenses[0]?.currency ?? "USD"}
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <form action={setBudgetAction} className="grid gap-3">
              <input type="hidden" name="caseId" value={id} />
              <p className="text-sm font-medium text-foreground">Definir presupuesto</p>
              <div className="grid grid-cols-2 gap-2">
                <Input name="amount" type="number" step="0.01" min="0" placeholder="Monto" defaultValue={budget ? String(budget.amount) : ""} />
                <Input name="currency" placeholder="USD" defaultValue={budget?.currency ?? "USD"} />
              </div>
              <Select name="paymentStatus" defaultValue={budget?.paymentStatus ?? "PENDING"}>
                {Object.entries(paymentStatusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
              <SubmitButton size="sm" variant="secondary">Guardar presupuesto</SubmitButton>
            </form>

            <form action={addExpenseAction} className="grid gap-3">
              <input type="hidden" name="caseId" value={id} />
              <p className="text-sm font-medium text-foreground">Registrar gasto</p>
              <Input name="description" placeholder="Concepto" required />
              <div className="grid grid-cols-2 gap-2">
                <Input name="amount" type="number" step="0.01" min="0" placeholder="Monto" required />
                <Input name="currency" placeholder="USD" defaultValue="USD" />
              </div>
              <Checkbox name="authorized" label="Gasto autorizado" />
              <SubmitButton size="sm" variant="secondary">Agregar gasto</SubmitButton>
            </form>
          </div>

          {expenses.length > 0 && (
            <div className="mt-5">
              <Table>
                <THead><TR><TH>Concepto</TH><TH>Monto</TH><TH>Autorizado</TH></TR></THead>
                <TBody>
                  {expenses.map((e) => (
                    <TR key={e.id}>
                      <TD className="text-foreground">{e.description}</TD>
                      <TD className="tabular-nums text-muted">{Number(e.amount).toLocaleString()} {e.currency}</TD>
                      <TD>{e.authorized ? <Badge tone="success">Sí</Badge> : <Badge tone="warning">No</Badge>}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
