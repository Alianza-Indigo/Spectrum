"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Pestañas del detalle de expediente; resalta la activa según la ruta. */
export function CaseTabs({ caseId }: { caseId: string }) {
  const pathname = usePathname();
  const base = `/consola/panel/expedientes/${caseId}`;
  const tabs = [
    { href: base, label: "Resumen" },
    { href: `${base}/tareas`, label: "Tareas" },
    { href: `${base}/investigacion`, label: "Investigación" },
    { href: `${base}/evidencia`, label: "Evidencia" },
    { href: `${base}/ia`, label: "IA" },
    { href: `${base}/informes`, label: "Informes" },
    { href: `${base}/gestion`, label: "Gestión" },
  ];

  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-border/60">
      {tabs.map((t) => {
        const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px border-b-2 px-3.5 py-2.5 text-sm transition-colors",
              active ? "border-cyan text-foreground" : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
