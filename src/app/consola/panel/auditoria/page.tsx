import type { Metadata } from "next";
import { pageGuard } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/console/page-header";
import { Table, THead, TH, TBody, TR, TD } from "@/components/console/table";
import { EmptyState } from "@/components/console/ui";

export const metadata: Metadata = {
  title: "Auditoría",
  robots: { index: false, follow: false },
};

/** Acorta un identificador largo para su presentación en tabla. */
function shortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export default async function AuditoriaPage() {
  const session = await pageGuard("audit:read");

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Auditoría"
        description="Registro inmutable de acciones sensibles para trazabilidad y cumplimiento. Se muestran los últimos 100 eventos de la organización."
      />

      {logs.length === 0 ? (
        <EmptyState
          title="Sin eventos de auditoría"
          hint="Las acciones sensibles (accesos, descargas, cambios de estado y entregas) aparecerán aquí."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Fecha</TH>
              <TH>Acción</TH>
              <TH>Recurso</TH>
              <TH>Actor</TH>
            </TR>
          </THead>
          <TBody>
            {logs.map((log) => (
              <TR key={log.id}>
                <TD className="whitespace-nowrap text-muted">
                  <time dateTime={log.createdAt.toISOString()}>
                    {log.createdAt.toISOString()}
                  </time>
                </TD>
                <TD className="font-mono text-xs text-foreground">{log.action}</TD>
                <TD className="text-muted">
                  <span className="text-foreground">{log.resourceType}</span>
                  {log.resourceId && (
                    <span className="ml-1.5 font-mono text-xs">{shortId(log.resourceId)}</span>
                  )}
                </TD>
                <TD className="font-mono text-xs text-muted">
                  {log.actorUserId ? shortId(log.actorUserId) : "sistema"}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
