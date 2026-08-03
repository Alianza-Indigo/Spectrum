import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Estado en forma de píldora, reutilizable con los mapas de `lib/status`. */
export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "indigo" | "cyan" | "violet" | "success" | "warning" | "danger";
}) {
  return <Badge tone={tone}>{label}</Badge>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-surface/30 px-6 py-14 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

/** Lista de definición para vistas de detalle. */
export function DescList({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-xs uppercase tracking-wide text-muted">{it.label}</dt>
          <dd className="mt-1 text-sm text-foreground">{it.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="spx-card p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TabNav({
  items,
  active,
}: {
  items: { href: string; label: string }[];
  active: string;
}) {
  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-border/60">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={cn(
            "-mb-px border-b-2 px-3.5 py-2.5 text-sm transition-colors",
            active === it.href
              ? "border-cyan text-foreground"
              : "border-transparent text-muted hover:text-foreground",
          )}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
