import type { Metadata } from "next";
import { pageGuard, requireCaseAccess } from "@/lib/auth/guards";
import { canAny, type Role } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { SectionCard, EmptyState, StatusPill } from "@/components/console/ui";
import { Table, THead, TH, TBody, TR, TD } from "@/components/console/table";
import { Label, Input, Textarea, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/console/submit-button";
import { evidenceStatusLabels, evidenceStatusTone } from "@/lib/status";
import { uploadEvidenceAction, setEvidenceStatusAction, downloadEvidenceAction } from "../../actions";

export const metadata: Metadata = { title: "Evidencia", robots: { index: false, follow: false } };

const evidenceTypes: [string, string][] = [
  ["DOCUMENT", "Documento"], ["IMAGE", "Imagen"], ["VIDEO", "Video"], ["AUDIO", "Audio"],
  ["EXPORTED_EMAIL", "Correo exportado"], ["SCREENSHOT", "Captura"], ["RECORD", "Registro"],
  ["NOTE", "Nota"], ["ARCHIVED_LINK", "Enlace archivado"], ["OTHER", "Otro"],
];
const evidenceStates = ["RECEIVED", "VERIFIED", "QUESTIONED", "EXCLUDED", "ANNEXED"] as const;

function fmtSize(bytes: bigint | null): string {
  if (!bytes) return "—";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default async function CaseEvidenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await pageGuard("evidence:read");
  const { id } = await params;
  await requireCaseAccess(session, id);
  const roles = session.roles as Role[];

  const items = await prisma.evidenceItem.findMany({
    where: { caseId: id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { events: true } } },
  });

  return (
    <div className="space-y-6">
      <SectionCard title="Evidencia y cadena de custodia">
        <p className="mb-4 text-xs text-muted">
          El archivo original se preserva con su hash SHA-256 y no puede reemplazarse. Toda descarga queda registrada.
        </p>
        {items.length === 0 ? (
          <EmptyState title="Sin evidencia" hint="Carga el primer elemento; se calculará su hash automáticamente." />
        ) : (
          <Table>
            <THead>
              <TR><TH>Interno</TH><TH>Original</TH><TH>Tipo</TH><TH>SHA-256</TH><TH>Tamaño</TH><TH>Estado</TH><TH>Custodia</TH><TH></TH></TR>
            </THead>
            <TBody>
              {items.map((e) => (
                <TR key={e.id}>
                  <TD className="font-mono text-xs text-foreground">{e.internalName}</TD>
                  <TD className="text-muted">{e.originalName}</TD>
                  <TD className="text-muted">{evidenceTypes.find((t) => t[0] === e.type)?.[1] ?? e.type}</TD>
                  <TD className="font-mono text-xs text-muted">{e.sha256 ? `${e.sha256.slice(0, 12)}…` : "pendiente"}</TD>
                  <TD className="text-muted">{fmtSize(e.sizeBytes)}</TD>
                  <TD><StatusPill label={evidenceStatusLabels[e.status]} tone={evidenceStatusTone[e.status]} /></TD>
                  <TD className="text-muted tabular-nums">{e._count.events}</TD>
                  <TD>
                    <div className="flex items-center gap-1">
                      <form action={downloadEvidenceAction}>
                        <input type="hidden" name="evidenceId" value={e.id} />
                        <SubmitButton size="sm" variant="ghost">Descargar</SubmitButton>
                      </form>
                      {canAny(roles, "evidence:review") && (
                        <form action={setEvidenceStatusAction} className="flex items-center gap-1">
                          <input type="hidden" name="caseId" value={id} />
                          <input type="hidden" name="evidenceId" value={e.id} />
                          <Select name="status" defaultValue={e.status} className="h-8 py-1 text-xs">
                            {evidenceStates.map((s) => <option key={s} value={s}>{evidenceStatusLabels[s]}</option>)}
                          </Select>
                          <SubmitButton size="sm" variant="ghost">Aplicar</SubmitButton>
                        </form>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        {canAny(roles, "evidence:upload") && (
          <form action={uploadEvidenceAction} className="mt-5 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="caseId" value={id} />
            <div>
              <Label htmlFor="file" required>Archivo</Label>
              <Input id="file" name="file" type="file" required className="file:mr-3 file:rounded-md file:border-0 file:bg-surface-raised file:px-3 file:py-1 file:text-foreground" />
            </div>
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select id="type" name="type" defaultValue="DOCUMENT">
                {evidenceTypes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="sourceOrigin">Fuente de origen</Label>
              <Input id="sourceOrigin" name="sourceOrigin" />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Input id="description" name="description" />
            </div>
            <div className="sm:col-span-2"><SubmitButton size="sm">Cargar evidencia</SubmitButton></div>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
