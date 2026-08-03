import type { Metadata } from "next";
import Link from "next/link";
import { pageGuard, orgScope } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/console/page-header";
import { Table, THead, TH, TBody, TR, TD } from "@/components/console/table";
import { StatusPill, EmptyState } from "@/components/console/ui";
import { ButtonLink } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Clientes", robots: { index: false, follow: false } };

const statusTone = {
  PROSPECT: "cyan", ACTIVE: "success", PAUSED: "warning", CLOSED: "neutral", RESTRICTED: "danger",
} as const;
const statusLabel = {
  PROSPECT: "Prospecto", ACTIVE: "Activo", PAUSED: "Pausado", CLOSED: "Cerrado", RESTRICTED: "Restringido",
} as const;

export default async function ClientesPage() {
  const session = await pageGuard("client:read");
  const clients = await prisma.client.findMany({
    where: orgScope(session),
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { cases: true, contacts: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Personas físicas y empresas. Los datos sensibles se muestran según permisos."
        actions={
          <ButtonLink href="/consola/panel/clientes/nuevo" size="sm">
            <Plus className="h-4 w-4" aria-hidden /> Nuevo cliente
          </ButtonLink>
        }
      />
      {clients.length === 0 ? (
        <EmptyState title="Aún no hay clientes" hint="Da de alta el primer cliente para abrir expedientes." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Cliente</TH>
              <TH>Tipo</TH>
              <TH>Estado</TH>
              <TH>Expedientes</TH>
              <TH>Contactos</TH>
            </TR>
          </THead>
          <TBody>
            {clients.map((c) => (
              <TR key={c.id}>
                <TD>
                  <Link href={`/consola/panel/clientes/${c.id}`} className="font-medium text-foreground hover:text-cyan">
                    {c.displayName}
                  </Link>
                </TD>
                <TD className="text-muted">{c.type === "COMPANY" ? "Empresa" : "Persona"}</TD>
                <TD><StatusPill label={statusLabel[c.status]} tone={statusTone[c.status]} /></TD>
                <TD className="text-muted">{c._count.cases}</TD>
                <TD className="text-muted">{c._count.contacts}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
