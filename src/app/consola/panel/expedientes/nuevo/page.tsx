import type { Metadata } from "next";
import { pageGuard, orgScope } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/console/page-header";
import { Card } from "@/components/ui/card";
import { Label, Input, Textarea, Select, FieldError } from "@/components/ui/field";
import { SubmitButton } from "@/components/console/submit-button";
import { createCaseAction } from "../actions";

export const metadata: Metadata = { title: "Nuevo expediente", robots: { index: false, follow: false } };

const caseTypes: [string, string][] = [
  ["DUE_DILIGENCE", "Debida diligencia"],
  ["CORPORATE", "Investigación corporativa"],
  ["BACKGROUND_CHECK", "Verificación de antecedentes"],
  ["ASSET_INVESTIGATION", "Investigación patrimonial"],
  ["PERSON_LOCATION", "Localización de personas"],
  ["FRAUD_INTERNAL", "Fraude / conflicto interno"],
  ["COMPETITIVE_INTELLIGENCE", "Inteligencia competitiva"],
  ["DOCUMENT_ANALYSIS", "Análisis documental"],
  ["REPUTATIONAL_RISK", "Riesgo reputacional"],
  ["LEGAL_SUPPORT", "Apoyo documental legal"],
  ["OTHER", "Otro"],
];

export default async function NuevoExpedientePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await pageGuard("case:create");
  const { error } = await searchParams;

  const [clients, members] = await Promise.all([
    prisma.client.findMany({ where: orgScope(session), orderBy: { displayName: "asc" }, select: { id: true, displayName: true } }),
    prisma.organizationMember.findMany({
      where: { organizationId: session.organizationId!, status: "ACTIVE" },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);
  const users = Array.from(new Map(members.map((m) => [m.user.id, m.user])).values());

  return (
    <div className="max-w-2xl">
      <PageHeader title="Nuevo expediente" backHref="/consola/panel/expedientes" backLabel="Expedientes" />
      <Card>
        <form action={createCaseAction} className="space-y-5">
          {error && <FieldError>Revisa los campos obligatorios.</FieldError>}
          <div>
            <Label htmlFor="internalName" required>Nombre interno del expediente</Label>
            <Input id="internalName" name="internalName" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="type" required>Tipo de investigación</Label>
              <Select id="type" name="type" defaultValue="DUE_DILIGENCE">
                {caseTypes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="clientId">Cliente</Label>
              <Select id="clientId" name="clientId" defaultValue="">
                <option value="">— Sin cliente aún —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="leadUserId">Responsable</Label>
            <Select id="leadUserId" name="leadUserId" defaultValue={session.userId}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="objective">Objetivo</Label>
            <Textarea id="objective" name="objective" />
          </div>
          <div>
            <Label htmlFor="scope">Alcance</Label>
            <Textarea id="scope" name="scope" placeholder="Necesario para poder abrir el expediente." />
          </div>
          <div>
            <Label htmlFor="exclusions">Exclusiones</Label>
            <Textarea id="exclusions" name="exclusions" />
          </div>
          <div>
            <Label htmlFor="jurisdiction">Jurisdicción / territorio</Label>
            <Input id="jurisdiction" name="jurisdiction" />
          </div>
          <p className="text-xs text-muted">
            El expediente se crea en estado «solicitud recibida». No podrá pasar a «abierto» sin cliente,
            alcance, responsable y autorización registrada.
          </p>
          <SubmitButton>Crear expediente</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
