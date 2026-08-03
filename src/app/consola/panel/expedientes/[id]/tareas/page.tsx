import type { Metadata } from "next";
import { pageGuard, requireCaseAccess } from "@/lib/auth/guards";
import { canAny, type Role } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { SectionCard, EmptyState, StatusPill } from "@/components/console/ui";
import { Table, THead, TH, TBody, TR, TD } from "@/components/console/table";
import { Label, Input, Textarea, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/console/submit-button";
import { taskStatusLabels, taskStatusTone } from "@/lib/status";
import { addTaskAction, updateTaskStatusAction, addActivityAction, addTimeEntryAction } from "../../actions";

export const metadata: Metadata = { title: "Tareas", robots: { index: false, follow: false } };

const taskStates = ["PENDIENTE", "ASIGNADA", "EN_PROGRESO", "BLOQUEADA", "EN_REVISION", "COMPLETADA", "CANCELADA"] as const;

export default async function CaseTareasPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await pageGuard("task:read");
  const { id } = await params;
  await requireCaseAccess(session, id);
  const roles = session.roles as Role[];

  const [tasks, members, activities] = await Promise.all([
    prisma.task.findMany({ where: { caseId: id }, orderBy: { createdAt: "desc" }, include: { timeEntries: true } }),
    prisma.organizationMember.findMany({ where: { organizationId: session.organizationId! }, include: { user: { select: { id: true, name: true } } } }),
    prisma.activity.findMany({ where: { caseId: id }, orderBy: { occurredAt: "desc" }, take: 40 }),
  ]);
  const users = Array.from(new Map(members.map((m) => [m.user.id, m.user])).values());
  const userName = (uid: string | null) => users.find((u) => u.id === uid)?.name ?? "—";

  return (
    <div className="space-y-6">
      <SectionCard title="Tareas">
        {tasks.length === 0 ? (
          <EmptyState title="Sin tareas" />
        ) : (
          <Table>
            <THead>
              <TR><TH>Tarea</TH><TH>Responsable</TH><TH>Prioridad</TH><TH>Estado</TH><TH>Horas</TH><TH></TH></TR>
            </THead>
            <TBody>
              {tasks.map((t) => {
                const hours = t.timeEntries.reduce((s, e) => s + Number(e.hours), 0);
                return (
                  <TR key={t.id}>
                    <TD className="font-medium text-foreground">{t.title}</TD>
                    <TD className="text-muted">{userName(t.assigneeUserId)}</TD>
                    <TD className="text-muted">{t.priority}</TD>
                    <TD><StatusPill label={taskStatusLabels[t.status]} tone={taskStatusTone[t.status]} /></TD>
                    <TD className="text-muted tabular-nums">{hours.toFixed(1)}</TD>
                    <TD>
                      {canAny(roles, "task:write") && (
                        <form action={updateTaskStatusAction} className="flex items-center gap-1">
                          <input type="hidden" name="caseId" value={id} />
                          <input type="hidden" name="taskId" value={t.id} />
                          <Select name="status" defaultValue={t.status} className="h-8 py-1 text-xs">
                            {taskStates.map((s) => <option key={s} value={s}>{taskStatusLabels[s]}</option>)}
                          </Select>
                          <SubmitButton size="sm" variant="ghost">Actualizar</SubmitButton>
                        </form>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}

        {canAny(roles, "task:write") && (
          <form action={addTaskAction} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="caseId" value={id} />
            <div>
              <Label htmlFor="title" required>Título</Label>
              <Input id="title" name="title" required />
            </div>
            <div>
              <Label htmlFor="assigneeUserId">Responsable</Label>
              <Select id="assigneeUserId" name="assigneeUserId" defaultValue="">
                <option value="">— Sin asignar —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Prioridad</Label>
              <Select id="priority" name="priority" defaultValue="MEDIUM">
                <option value="LOW">Baja</option><option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option><option value="URGENT">Urgente</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="authorizedMethod">Método autorizado</Label>
              <Input id="authorizedMethod" name="authorizedMethod" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" name="description" />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton size="sm">Crear tarea</SubmitButton>
            </div>
          </form>
        )}
      </SectionCard>

      {/* Registro de tiempo */}
      {canAny(roles, "task:write") && (
        <SectionCard title="Registrar tiempo">
          <form action={addTimeEntryAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="caseId" value={id} />
            <div>
              <Label htmlFor="taskId">Tarea</Label>
              <Select id="taskId" name="taskId" defaultValue="">
                <option value="">— General —</option>
                {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="hours">Horas</Label>
              <Input id="hours" name="hours" type="number" step="0.25" min="0" className="w-28" defaultValue="1" />
            </div>
            <div>
              <Label htmlFor="note">Nota</Label>
              <Input id="note" name="note" />
            </div>
            <SubmitButton size="sm" variant="secondary">Registrar</SubmitButton>
          </form>
        </SectionCard>
      )}

      {/* Línea de actividades (inmutable) */}
      <SectionCard title="Actividades del expediente">
        <p className="mb-4 text-xs text-muted">Registro cronológico. Las correcciones se agregan como nuevas entradas; no se reescribe el histórico.</p>
        {activities.length === 0 ? (
          <EmptyState title="Sin actividades" />
        ) : (
          <ul className="mb-5 space-y-3">
            {activities.map((a) => (
              <li key={a.id} className="border-l-2 border-border/60 pl-4">
                <p className="text-xs text-muted">{a.occurredAt.toISOString().replace("T", " ").slice(0, 16)} · {a.kind} · {userName(a.authorUserId)}</p>
                <p className="text-sm text-foreground">{a.content}</p>
              </li>
            ))}
          </ul>
        )}
        {canAny(roles, "activity:write") && (
          <form action={addActivityAction} className="grid gap-3 sm:grid-cols-4">
            <input type="hidden" name="caseId" value={id} />
            <div>
              <Label htmlFor="kind">Tipo</Label>
              <Select id="kind" name="kind" defaultValue="nota">
                <option value="nota">Nota</option><option value="llamada">Llamada</option>
                <option value="consulta">Consulta</option><option value="hallazgo">Hallazgo</option>
                <option value="correccion">Corrección</option>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Label htmlFor="content" required>Contenido</Label>
              <Input id="content" name="content" required />
            </div>
            <div className="sm:col-span-4">
              <SubmitButton size="sm" variant="secondary">Agregar actividad</SubmitButton>
            </div>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
