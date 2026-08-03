import Link from "next/link";
import { requireSession } from "@/lib/auth/current-user";
import { logout } from "../actions";
import { Logo } from "@/components/site/logo";
import { Badge } from "@/components/ui/badge";
import { roleLabels, canAny, type Permission, type Role } from "@/lib/auth/rbac";
import {
  LayoutDashboard, FolderKanban, Users, ListChecks,
  ShieldCheck, Settings, LogOut,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
  available: boolean;
};

const items: NavItem[] = [
  { href: "/consola/panel", label: "Panel", icon: LayoutDashboard, available: true },
  { href: "/consola/panel/expedientes", label: "Expedientes", icon: FolderKanban, permission: "case:read_assigned", available: true },
  { href: "/consola/panel/clientes", label: "Clientes", icon: Users, permission: "client:read", available: true },
  { href: "/consola/panel/tareas", label: "Tareas", icon: ListChecks, permission: "task:read", available: true },
  { href: "/consola/panel/auditoria", label: "Auditoría", icon: ShieldCheck, permission: "audit:read", available: true },
  { href: "/consola/panel/administracion", label: "Administración", icon: Settings, permission: "org:manage", available: true },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const roles = session.roles as Role[];
  const visible = items.filter((i) => !i.permission || canAny(roles, i.permission));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-surface/40 md:flex">
        <div className="flex h-16 items-center border-b border-border/60 px-5">
          <Logo href="/consola/panel" />
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Consola">
          {visible.map((item) => (
            <Link
              key={item.href}
              href={item.available ? item.href : "/consola/panel"}
              aria-disabled={!item.available}
              className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                item.available ? "text-muted hover:bg-surface-raised hover:text-foreground" : "text-muted/50"
              }`}
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </span>
              {!item.available && <span className="text-[10px] uppercase tracking-wide">pronto</span>}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border/60 p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium text-foreground">{session.name}</p>
            <p className="truncate text-xs text-muted">{session.email}</p>
          </div>
          <form action={logout}>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface-raised hover:text-foreground">
              <LogOut className="h-4 w-4" aria-hidden /> Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border/60 px-5">
          <span className="text-sm text-muted md:hidden">
            <Logo href="/consola/panel" />
          </span>
          <div className="ml-auto flex items-center gap-2">
            {roles.map((r) => (
              <Badge key={r} tone="indigo">{roleLabels[r]}</Badge>
            ))}
          </div>
        </header>
        <main className="flex-1 p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
