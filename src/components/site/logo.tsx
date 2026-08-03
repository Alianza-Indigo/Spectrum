import Link from "next/link";
import { cn } from "@/lib/utils";
import { site } from "@/config/site";

/** Marca SPECTRUM: un prisma que dispersa luz en el espectro índigo→magenta. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="relative inline-flex h-8 w-8 items-center justify-center">
        <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
          <defs>
            <linearGradient id="spx-mark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgb(99 102 241)" />
              <stop offset="50%" stopColor="rgb(139 92 246)" />
              <stop offset="100%" stopColor="rgb(232 62 168)" />
            </linearGradient>
          </defs>
          <path d="M16 3 L28 25 H4 Z" fill="none" stroke="url(#spx-mark)" strokeWidth="1.75" strokeLinejoin="round" />
          <line x1="9" y1="19" x2="23" y2="19" stroke="rgb(34 211 238)" strokeWidth="1.25" opacity="0.9" />
          <line x1="11.5" y1="15" x2="20.5" y2="15" stroke="rgb(139 92 246)" strokeWidth="1.25" opacity="0.7" />
        </svg>
      </span>
      <span className="text-base font-semibold tracking-tight text-foreground">
        {site.name}
        <span className="ml-1 hidden text-xs font-normal text-muted sm:inline">Agencia de Inteligencia</span>
      </span>
    </Link>
  );
}
