import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageGuard, orgScope } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/console/page-header";
import { SectionCard, DescList, StatusPill, EmptyState } from "@/components/console/ui";
import { Table, THead, TH, TBody, TR, TD } from "@/components/console/table";
import { Label, Input, Checkbox } from "@/components/ui/field";
import { SubmitButton } from "@/components/console/submit-button";
import { Badge } from "@/components/ui/badge";
import { caseStatusLabels, caseStatusTone } from "@/lib/status";
import { addContact } from "../actions";

export const metadata: Metadata = { title: "Cliente", robots: { index: false, follow: false } };

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await pageGuard("client:read");
  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, ...orgScope(session) },
    include: { contacts: true, cases: { orderBy: { createdAt: "desc" } } },
  });
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.displayName}
        description={client.legalName ?? undefined}
        backHref="/consola/panel/clientes"
        backLabel="Clientes"
      />

      <SectionCard title="Datos del cliente">
        <DescList
          items={[
            { label: "Tipo", value: client.type === "COMPANY" ? "Empresa" : "Persona física" },
            { label: "Identificación fiscal", value: client.taxId },
            { label: "Estado", value: client.status },
            { label: "Etiquetas", value: client.tags.join(", ") },
          ]}
        />
      </SectionCard>

      <SectionCard title="Contactos">
        {client.contacts.length === 0 ? (
          <EmptyState title="Sin contactos" hint="Agrega al menos un contacto o representante autorizado." />
        ) : (
          <Table>
            <THead>
              <TR><TH>Nombre</TH><TH>Rol</TH><TH>Correo</TH><TH>Autorizado</TH></TR>
            </THead>
            <TBody>
              {client.contacts.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium text-foreground">{c.name}</TD>
                  <TD className="text-muted">{c.role ?? "—"}</TD>
                  <TD className="text-muted">{c.email ?? "—"}</TD>
                  <TD>{c.isAuthorized ? <Badge tone="success">Sí</Badge> : <Badge tone="neutral">No</Badge>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        <form action={addContact} className="mt-5 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="clientId" value={client.id} />
          <div>
            <Label htmlFor="name" required>Nombre</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="role">Rol</Label>
            <Input id="role" name="role" />
          </div>
          <div>
            <Label htmlFor="email">Correo</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="sm:col-span-2">
            <Checkbox id="isAuthorized" name="isAuthorized" label="Representante autorizado" />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton size="sm" variant="secondary">Agregar contacto</SubmitButton>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Expedientes del cliente">
        {client.cases.length === 0 ? (
          <EmptyState title="Sin expedientes" />
        ) : (
          <Table>
            <THead>
              <TR><TH>Folio</TH><TH>Nombre interno</TH><TH>Estado</TH></TR>
            </THead>
            <TBody>
              {client.cases.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/consola/panel/expedientes/${c.id}`} className="font-mono text-sm text-cyan hover:underline">
                      {c.folio}
                    </Link>
                  </TD>
                  <TD className="text-foreground">{c.internalName}</TD>
                  <TD><StatusPill label={caseStatusLabels[c.status]} tone={caseStatusTone[c.status]} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}
