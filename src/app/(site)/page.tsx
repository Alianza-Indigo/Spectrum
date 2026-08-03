import { ButtonLink } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ServiceIcon } from "@/components/site/service-icon";
import { site, services, process, sectors, faqs } from "@/config/site";
import { ShieldCheck, GitBranch, Fingerprint, ArrowRight } from "lucide-react";

const indicators = [
  { icon: ShieldCheck, label: "Discreción", detail: "Confidencialidad por diseño y control de accesos por rol." },
  { icon: GitBranch, label: "Metodología", detail: "Hechos, fuentes e inferencias siempre separados." },
  { icon: Fingerprint, label: "Trazabilidad", detail: "Cadena de custodia y auditoría verificable de extremo a extremo." },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-20 sm:pt-28">
        <div className="max-w-3xl">
          <Badge tone="indigo" className="mb-6">Agencia de inteligencia · operación lícita</Badge>
          <h1 className="text-4xl font-semibold leading-[1.1] sm:text-6xl">
            <span className="spx-gradient-text">{site.tagline}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            {site.description}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/solicitud" size="lg">
              Solicitar evaluación confidencial
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/servicios" size="lg" variant="outline">
              Conocer nuestros servicios
            </ButtonLink>
          </div>
        </div>

        {/* Indicadores */}
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {indicators.map((it) => (
            <Card key={it.label} className="p-5">
              <it.icon className="h-6 w-6 text-cyan" aria-hidden />
              <p className="mt-3 font-medium text-foreground">{it.label}</p>
              <p className="mt-1 text-sm text-muted">{it.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      <div className="spx-hairline mx-auto max-w-6xl" />

      {/* Servicios destacados */}
      <section id="servicios" className="mx-auto max-w-6xl px-5 py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-semibold">Servicios</h2>
          <p className="mt-3 text-muted">
            Capacidades de inteligencia corporativa y análisis documental, ejecutadas con
            métodos permitidos y fuentes autorizadas.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 6).map((s) => (
            <Card key={s.slug} className="transition-colors hover:border-cyan/40">
              <ServiceIcon name={s.icon} className="h-6 w-6 text-violet" />
              <CardTitle className="mt-4">{s.title}</CardTitle>
              <CardDescription>{s.description}</CardDescription>
            </Card>
          ))}
        </div>
        <div className="mt-8">
          <ButtonLink href="/servicios" variant="secondary" size="sm">
            Ver todos los servicios <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
      </section>

      {/* Proceso en 5 pasos */}
      <section className="border-y border-border/60 bg-surface/30">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-semibold">Proceso de trabajo</h2>
            <p className="mt-3 text-muted">
              Cinco pasos que garantizan legalidad, calidad y trazabilidad en cada expediente.
            </p>
          </div>
          <ol className="grid gap-6 md:grid-cols-5">
            {process.map((p) => (
              <li key={p.step} className="relative">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo to-violet text-sm font-semibold text-white">
                  {p.step}
                </span>
                <h3 className="mt-4 text-sm font-semibold text-foreground">{p.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{p.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Sectores */}
      <section id="sectores" className="mx-auto max-w-6xl px-5 py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-semibold">Sectores atendidos</h2>
          <p className="mt-3 text-muted">Acompañamos a organizaciones y particulares que requieren decisiones informadas.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {sectors.map((sector) => (
            <Badge key={sector} tone="neutral" className="px-3 py-1.5 text-sm">
              {sector}
            </Badge>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border/60 bg-surface/30">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <h2 className="text-3xl font-semibold">Preguntas frecuentes</h2>
          <div className="mt-8 divide-y divide-border/60">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium text-foreground marker:content-['']">
                  {f.q}
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-90" aria-hidden />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + aviso legal */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Card className="flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold">¿Necesitas claridad sobre un asunto sensible?</h2>
            <p className="mt-2 text-sm text-muted">{site.legalNotice}</p>
          </div>
          <ButtonLink href="/solicitud" size="lg" className="shrink-0">
            Solicitar evaluación confidencial
          </ButtonLink>
        </Card>
      </section>
    </>
  );
}
