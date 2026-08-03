import type { Metadata } from "next";
import Link from "next/link";
import { pageGuard, caseListWhere } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/console/page-header";
import { Table, THead, TH, TBody, TR, TD } from "@/components/console/table";
import { StatusPill, EmptyState } from "@/components/console/ui";
import { ButtonLink } from "@/components/ui/button";
import { caseStatusLabels, caseStatusTone } from "@/lib/status";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Expedientes", robots: { index: false, follow: false } };

const typeLabels: Record<string, string> = {
  CORPORATE: "Corporativa", DUE_DILIGENCE: "Debida diligencia", BACKGROUND_CHECK: "Antecedentes",
  ASSET_INVESTIGATION: "Patrimonial", PERSON_LOCATION: "Localización", FRAUD_INTERNAL: "Fraude interno",
  COMPETITIVE_INTELLIGENCE: "Inteligencia competitiva", DOCUMENT_ANALYSIS: "Análisis documental",
  REPUTATIONAL_RISK: "Riesgo reputacional", LEGAL_SUPPORT: "Apoyo legal", OTHER: "Otro",
};

export default async function ExpedientesPage() {
  const session = await pageGuard("case:read_assigned");
  const where = await caseListWhere(session);
  const cases = await prisma.case.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { client: { select: { displayName: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Expedientes"
        description="Expedientes visibles según tu rol y asignaciones."
        actions={
          <ButtonLink href="/consola/panel/expedientes/nuevo" size="sm">
            <Plus className="h-4 w-4" aria-hidden /> Nuevo expediente
          </ButtonLink>
        }
      />
      {cases.length === 0 ? (
        <EmptyState title="Sin expedientes visibles" hint="Crea un expediente o solicita que te asignen a uno." />
      ) : (
        <Table>
          <THead>
            <TR><TH>Folio</TH><TH>Nombre interno</TH><TH>Cliente</TH><TH>Tipo</TH><TH>Estado</TH></TR>
          </THead>
          <TBody>
            {cases.map((c) => (
              <TR key={c.id}>
                <TD>
                  <Link href={`/consola/panel/expedientes/${c.id}`} className="font-mono text-sm text-cyan hover:underline">
                    {c.folio}
                  </Link>
                </TD>
                <TD className="font-medium text-foreground">{c.internalName}</TD>
                <TD className="text-muted">{c.client?.displayName ?? "—"}</TD>
                <TD className="text-muted">{typeLabels[c.type] ?? c.type}</TD>
                <TD><StatusPill label={caseStatusLabels[c.status]} tone={caseStatusTone[c.status]} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
