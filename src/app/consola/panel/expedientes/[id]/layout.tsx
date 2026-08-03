import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { pageGuard, requireCaseAccess } from "@/lib/auth/guards";
import { StatusPill } from "@/components/console/ui";
import { CaseTabs } from "@/components/console/case-tabs";
import { caseStatusLabels, caseStatusTone } from "@/lib/status";

export default async function CaseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await pageGuard("case:read_assigned");
  const { id } = await params;
  const c = await requireCaseAccess(session, id);

  return (
    <div>
      <Link href="/consola/panel/expedientes" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Expedientes
      </Link>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm text-cyan">{c.folio}</span>
        <h1 className="text-2xl font-semibold">{c.internalName}</h1>
        <StatusPill label={caseStatusLabels[c.status]} tone={caseStatusTone[c.status]} />
      </div>
      <CaseTabs caseId={id} />
      {children}
    </div>
  );
}
