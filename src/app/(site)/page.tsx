import { ButtonLink } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ServiceIcon } from "@/components/site/service-icon";
import { site, services, process, sectors, faqs } from "@/config/site";
import { ShieldCheck, GitBranch, Fingerprint, ArrowRight, Search, FileText, Crosshair, CheckCircle2 } from "lucide-react";

const indicators = [
  { icon: ShieldCheck, label: "Discreción", detail: "Confidencialidad por diseño y control de accesos por rol." },
  { icon: GitBranch, label: "Metodología", detail: "Hechos, fuentes e inferencias siempre separados." },
  { icon: Fingerprint, label: "Trazabilidad", detail: "Cadena de custodia y auditoría verificable de extremo a extremo." },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_35%,rgb(var(--spx-violet)/.18),transparent_34%),radial-gradient(circle_at_58%_90%,rgb(var(--spx-cyan)/.08),transparent_28%)]" />
        <div className="absolute right-[5rem] top-24 -z-10 h-[24rem] w-[24rem] rounded-full border border-amber-300/20 bg-[url('/spectrum-seal-dark.jpg')] bg-cover bg-center opacity-[0.13] mix-blend-screen" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-16 sm:pt-24 lg:grid-cols-2 lg:gap-8">
          <div className="lg:pl-4">
          <Badge tone="indigo" className="mb-6">Agencia de inteligencia · operación lícita</Badge>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.04] sm:text-6xl lg:text-7xl">
            <span className="spx-gradient-text">Inteligencia que convierte la incertidumbre en claridad.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            {site.description}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/solicitud" size="lg">
              Solicitar evaluación confidencial
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/metodologia" size="lg" variant="outline">
              Conocer nuestra metodología
            </ButtonLink>
          </div>
          </div>
          <div className="relative hidden min-h-[25rem] lg:block lg:pr-4">
            <div className="absolute inset-8 rounded-full border border-indigo/40 shadow-[0_0_90px_rgb(var(--spx-violet)/.2)]" />
            <div className="absolute inset-20 rounded-full border border-cyan/40" />
            <div className="absolute inset-[7.5rem] rounded-full border border-violet/60 bg-violet/10" />
            <Crosshair className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 text-cyan/80" strokeWidth={1} />
            <div className="spx-card absolute left-0 top-16 p-4 text-xs"><FileText className="mb-2 h-5 w-5 text-cyan" />Fuentes abiertas<br /><span className="text-muted">verificadas</span></div>
            <div className="spx-card absolute right-0 top-28 p-4 text-xs"><Search className="mb-2 h-5 w-5 text-violet" />Análisis<br /><span className="text-muted">de evidencia</span></div>
            <div className="spx-card absolute bottom-10 left-1/2 -translate-x-1/2 p-4 text-xs"><CheckCircle2 className="mb-2 h-5 w-5 text-amber-300" />Informe auditable</div>
          </div>
        </div>

        {/* Indicadores */}
        <div className="mx-auto grid max-w-6xl gap-4 px-5 pb-10 sm:grid-cols-3">
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
          <Badge tone="neutral" className="mb-4">Capacidades SPECTRUM</Badge>
          <h2 className="text-3xl font-semibold sm:text-4xl">Investigación con método. Información para decidir.</h2>
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

      <section className="border-y border-border/60 bg-surface/30">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <Badge tone="indigo" className="mb-4">Investigadores privados</Badge>
            <h2 className="text-3xl font-semibold sm:text-4xl">Lo que importa no es cuánto se investiga, sino cuánto puede sostenerse.</h2>
            <p className="mt-4 leading-relaxed text-muted">Cada encargo se delimita, documenta y analiza con separación entre hechos, declaraciones, inferencias y conclusiones.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Información obtenida lícitamente", "Cadena de custodia documentada", "Revisión humana de cada hallazgo", "Entrega controlada y confidencial"].map((item) => <Card key={item} className="flex items-center gap-3 p-5"><CheckCircle2 className="h-5 w-5 shrink-0 text-amber-300" /><span className="text-sm">{item}</span></Card>)}
          </div>
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
