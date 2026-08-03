import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { site } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface/40">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted">{site.legalNotice}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="mb-3 font-medium text-foreground">Plataforma</p>
              <ul className="space-y-2 text-muted">
                <li><Link href="/servicios" className="hover:text-foreground">Servicios</Link></li>
                <li><Link href="/metodologia" className="hover:text-foreground">Metodología</Link></li>
                <li><Link href="/solicitud" className="hover:text-foreground">Solicitar evaluación</Link></li>
                <li><Link href="/consola" className="hover:text-foreground">Acceder a la consola</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-medium text-foreground">Legal</p>
              <ul className="space-y-2 text-muted">
                <li><Link href="/aviso-legal" className="hover:text-foreground">Aviso legal y privacidad</Link></li>
                <li><Link href="/#faq" className="hover:text-foreground">Preguntas frecuentes</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="spx-hairline my-8" />
        <div className="flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.fullName}. Operación discreta, lícita y auditable.</p>
          <p>Inteligencia estratégica · Precisión · Discreción</p>
        </div>
      </div>
    </footer>
  );
}
