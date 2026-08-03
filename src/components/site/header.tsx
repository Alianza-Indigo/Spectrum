import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { ButtonLink } from "@/components/ui/button";
import { nav } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-base/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Principal">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/consola" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Acceder
          </ButtonLink>
          <ButtonLink href="/solicitud" size="sm">
            Solicitar evaluación
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
