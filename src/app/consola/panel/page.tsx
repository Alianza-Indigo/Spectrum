import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { caseVisibility, type Role } from "@/lib/auth/rbac";
import { FolderKanban, ListChecks, Inbox, FileBox } from "lucide-react";

export const metadata: Metadata = { title: "Panel", robots: { index: false, follow: false } };

type Metrics = {
  activeCases: number;
  overdueTasks: number;
  pendingInquiries: number;
  evidenceToReview: number;
  available: boolean;
};

async function loadMetrics(organizationId: string | null): Promise<Metrics> {
  if (!organizationId) {
    return { activeCases: 0, overdueTasks: 0, pendingInquiries: 0, evidenceToReview: 0, available: true };
  }
  try {
    const now = new Date();
    const [activeCases, overdueTasks, pendingInquiries, evidenceToReview] = await Promise.all([
      prisma.case.count({
        where: { organizationId, status: { in: ["ABIERTO", "EN_INVESTIGACION", "EN_REVISION"] } },
      }),
      prisma.task.count({
        where: { organizationId, dueAt: { lt: now }, status: { notIn: ["COMPLETADA", "CANCELADA"] } },
      }),
      prisma.inquiry.count({ where: { status: { in: ["RECEIVED", "IN_TRIAGE"] } } }),
      prisma.evidenceItem.count({ where: { organizationId, status: "RECEIVED" } }),
    ]);
    return { activeCases, overdueTasks, pendingInquiries, evidenceToReview, available: true };
  } catch {
    return { activeCases: 0, overdueTasks: 0, pendingInquiries: 0, evidenceToReview: 0, available: false };
  }
}

const roadmap = [
  { phase: "Fase 2", modules: "Clientes, expedientes, permisos y tareas" },
  { phase: "Fase 3", modules: "Fuentes, hallazgos, línea de tiempo y evidencia" },
  { phase: "Fase 4", modules: "Informes, revisión, PDF y portal cliente" },
  { phase: "Fase 5", modules: "IA asistida, búsqueda y análisis documental" },
  { phase: "Fase 6", modules: "Auditoría, retención, métricas y operación" },
  { phase: "Fase 7", modules: "Facturación, automatizaciones e integraciones" },
];

export default async function PanelPage() {
  const session = await requireSession();
  const metrics = await loadMetrics(session.organizationId);
  const scope = caseVisibility(session.roles as Role[]);

  const cards = [
    { label: "Expedientes activos", value: metrics.activeCases, icon: FolderKanban, tone: "indigo" as const },
    { label: "Tareas atrasadas", value: metrics.overdueTasks, icon: ListChecks, tone: "warning" as const },
    { label: "Solicitudes por atender", value: metrics.pendingInquiries, icon: Inbox, tone: "cyan" as const },
    { label: "Evidencia por revisar", value: metrics.evidenceToReview, icon: FileBox, tone: "violet" as const },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Hola, {session.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted">
          Vista general de la operación · visibilidad de expedientes: {scope === "all" ? "organización" : "asignados"}
        </p>
      </div>

      {!metrics.available && (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Métricas no disponibles: verifica que <code>DATABASE_URL</code> esté configurada y las migraciones aplicadas.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between">
              <c.icon className="h-5 w-5 text-muted" aria-hidden />
              <Badge tone={c.tone}>{c.label.split(" ")[0]}</Badge>
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums">{c.value}</p>
            <p className="mt-1 text-sm text-muted">{c.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>Módulos de la plataforma</CardTitle>
        <CardDescription>
          Esta versión entrega la base (Fase 0–1): marca, seguridad, sitio público, solicitudes y
          autenticación. Los siguientes módulos se habilitan según el roadmap por fases.
        </CardDescription>
        <ul className="mt-5 divide-y divide-border/60">
          {roadmap.map((r) => (
            <li key={r.phase} className="flex items-center justify-between py-3">
              <span className="text-sm text-foreground">{r.modules}</span>
              <Badge tone="neutral">{r.phase}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
