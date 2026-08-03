import type { Metadata } from "next";
import { Role, RetentionAction } from "@prisma/client";
import { pageGuard } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { roleLabels } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/console/page-header";
import { SectionCard, StatusPill } from "@/components/console/ui";
import { Table, THead, TH, TBody, TR, TD } from "@/components/console/table";
import { Label, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/console/submit-button";
import { createUser, createRetentionPolicy } from "./actions";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};

const retentionActionLabels: Record<RetentionAction, string> = {
  RETAIN: "Conservar",
  REVIEW: "Revisar",
  ANONYMIZE: "Anonimizar",
  DELETE: "Eliminar",
};

const memberStatusLabels: Record<string, string> = {
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
  REMOVED: "Retirado",
};

const memberStatusTone: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  REMOVED: "danger",
};

export default async function AdministracionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await pageGuard("org:manage");
  const sp = await searchParams;

  const [members, policies] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: session.organizationId ?? "__none__" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.retentionPolicy.findMany({
      where: { organizationId: session.organizationId ?? "__none__" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const okMessage =
    sp.ok === "user"
      ? "Usuario creado correctamente."
      : sp.ok === "retention"
        ? "Política de retención creada correctamente."
        : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administración"
        description="Gestión de usuarios, roles y políticas de retención de la organización."
      />

      {sp.error && (
        <div
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {sp.error}
        </div>
      )}
      {okMessage && (
        <div
          role="status"
          className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success"
        >
          {okMessage}
        </div>
      )}

      <SectionCard title="Usuarios">
        {members.length === 0 ? (
          <p className="mb-6 text-sm text-muted">Aún no hay miembros en la organización.</p>
        ) : (
          <div className="mb-6">
            <Table>
              <THead>
                <TR>
                  <TH>Nombre</TH>
                  <TH>Correo</TH>
                  <TH>Rol</TH>
                  <TH>Estado</TH>
                </TR>
              </THead>
              <TBody>
                {members.map((m) => (
                  <TR key={m.id}>
                    <TD className="text-foreground">{m.user.name}</TD>
                    <TD className="text-muted">{m.user.email}</TD>
                    <TD className="text-muted">{roleLabels[m.role]}</TD>
                    <TD>
                      <StatusPill
                        label={memberStatusLabels[m.status] ?? m.status}
                        tone={memberStatusTone[m.status] ?? "neutral"}
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}

        <form action={createUser} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="user-name" required>
              Nombre
            </Label>
            <Input id="user-name" name="name" required autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="user-email" required>
              Correo electrónico
            </Label>
            <Input id="user-email" name="email" type="email" required autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="user-role" required>
              Rol
            </Label>
            <Select id="user-role" name="role" required defaultValue={Role.INVESTIGATOR}>
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="user-password" required>
              Contraseña
            </Label>
            <Input
              id="user-password"
              name="password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton>Crear usuario</SubmitButton>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Políticas de retención">
        {policies.length === 0 ? (
          <p className="mb-6 text-sm text-muted">Aún no hay políticas de retención definidas.</p>
        ) : (
          <div className="mb-6">
            <Table>
              <THead>
                <TR>
                  <TH>Nombre</TH>
                  <TH>Días de retención</TH>
                  <TH>Acción al expirar</TH>
                </TR>
              </THead>
              <TBody>
                {policies.map((p) => (
                  <TR key={p.id}>
                    <TD className="text-foreground">{p.name}</TD>
                    <TD className="text-muted">{p.retainDays}</TD>
                    <TD className="text-muted">{retentionActionLabels[p.actionOnExpiry]}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}

        <form action={createRetentionPolicy} className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="policy-name" required>
              Nombre
            </Label>
            <Input id="policy-name" name="name" required autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="policy-days" required>
              Días de retención
            </Label>
            <Input id="policy-days" name="retainDays" type="number" min={1} required />
          </div>
          <div>
            <Label htmlFor="policy-action" required>
              Acción al expirar
            </Label>
            <Select
              id="policy-action"
              name="actionOnExpiry"
              required
              defaultValue={RetentionAction.REVIEW}
            >
              {Object.entries(retentionActionLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-3">
            <SubmitButton>Crear política</SubmitButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
