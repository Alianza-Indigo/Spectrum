import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { caseVisibility, type Role } from "@/lib/auth/rbac";
import { FolderKanban, ListChecks, Inbox, FileBox, ArrowRight } from "lucide-react";

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

const quickLinks = [
  { href: "/consola/panel/expedientes", label: "Expedientes", detail: "Abrir, investigar y entregar" },
  { href: "/consola/panel/clientes", label: "Clientes", detail: "Altas y contactos autorizados" },
  { href: "/consola/panel/tareas", label: "Tareas", detail: "Pendientes por vencer" },
  { href: "/consola/panel/auditoria", label: "Auditoría", detail: "Accesos y cambios" },
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
        <CardTitle>Accesos rápidos</CardTitle>
        <CardDescription>Operación de extremo a extremo: expedientes, clientes, tareas y auditoría.</CardDescription>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {quickLinks.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-surface/40 px-4 py-3 transition-colors hover:border-cyan/40"
            >
              <span>
                <span className="block text-sm font-medium text-foreground">{q.label}</span>
                <span className="block text-xs text-muted">{q.detail}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted" aria-hidden />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
