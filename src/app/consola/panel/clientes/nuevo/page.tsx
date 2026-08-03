import type { Metadata } from "next";
import { pageGuard } from "@/lib/auth/guards";
import { PageHeader } from "@/components/console/page-header";
import { Card } from "@/components/ui/card";
import { Label, Input, Select, FieldError } from "@/components/ui/field";
import { SubmitButton } from "@/components/console/submit-button";
import { createClient } from "../actions";

export const metadata: Metadata = { title: "Nuevo cliente", robots: { index: false, follow: false } };

export default async function NuevoClientePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await pageGuard("client:write");
  const { error } = await searchParams;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Nuevo cliente" backHref="/consola/panel/clientes" backLabel="Clientes" />
      <Card>
        <form action={createClient} className="space-y-5">
          {error && <FieldError>Revisa los campos: el nombre es obligatorio.</FieldError>}
          <div>
            <Label htmlFor="type" required>Tipo</Label>
            <Select id="type" name="type" defaultValue="COMPANY">
              <option value="COMPANY">Empresa</option>
              <option value="PERSON">Persona física</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="displayName" required>Nombre visible</Label>
            <Input id="displayName" name="displayName" required />
          </div>
          <div>
            <Label htmlFor="legalName">Razón social</Label>
            <Input id="legalName" name="legalName" />
          </div>
          <div>
            <Label htmlFor="taxId">Identificación fiscal</Label>
            <Input id="taxId" name="taxId" />
          </div>
          <div>
            <Label htmlFor="status">Estado de la relación</Label>
            <Select id="status" name="status" defaultValue="PROSPECT">
              <option value="PROSPECT">Prospecto</option>
              <option value="ACTIVE">Activo</option>
              <option value="PAUSED">Pausado</option>
              <option value="CLOSED">Cerrado</option>
              <option value="RESTRICTED">Restringido</option>
            </Select>
          </div>
          <SubmitButton>Crear cliente</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
