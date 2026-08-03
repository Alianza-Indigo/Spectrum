import type { Metadata } from "next";
import Link from "next/link";
import { pageGuard, orgScope, visibleCaseIds } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/console/page-header";
import { Table, THead, TH, TBody, TR, TD } from "@/components/console/table";
import { StatusPill, EmptyState } from "@/components/console/ui";
import { taskStatusLabels, taskStatusTone } from "@/lib/status";

export const metadata: Metadata = { title: "Tareas", robots: { index: false, follow: false } };

export default async function TareasPage() {
  const session = await pageGuard("task:read");
  const ids = await visibleCaseIds(session);

  const tasks = await prisma.task.findMany({
    where: {
      ...orgScope(session),
      status: { notIn: ["COMPLETADA", "CANCELADA"] },
      ...(ids ? { caseId: { in: ids } } : {}),
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    include: { case: { select: { id: true, folio: true } } },
    take: 200,
  });

  const now = new Date();

  return (
    <div>
      <PageHeader title="Tareas" description="Tareas activas de los expedientes visibles para ti." />
      {tasks.length === 0 ? (
        <EmptyState title="Sin tareas activas" />
      ) : (
        <Table>
          <THead>
            <TR><TH>Tarea</TH><TH>Expediente</TH><TH>Prioridad</TH><TH>Vence</TH><TH>Estado</TH></TR>
          </THead>
          <TBody>
            {tasks.map((t) => {
              const overdue = t.dueAt && t.dueAt < now;
              return (
                <TR key={t.id}>
                  <TD className="font-medium text-foreground">{t.title}</TD>
                  <TD>
                    <Link href={`/consola/panel/expedientes/${t.case.id}/tareas`} className="font-mono text-xs text-cyan hover:underline">
                      {t.case.folio}
                    </Link>
                  </TD>
                  <TD className="text-muted">{t.priority}</TD>
                  <TD className={overdue ? "text-danger" : "text-muted"}>
                    {t.dueAt ? t.dueAt.toISOString().slice(0, 10) : "—"}
                  </TD>
                  <TD><StatusPill label={taskStatusLabels[t.status]} tone={taskStatusTone[t.status]} /></TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}
