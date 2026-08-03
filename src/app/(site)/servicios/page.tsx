import type { Metadata } from "next";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { ServiceIcon } from "@/components/site/service-icon";
import { services } from "@/config/site";

export const metadata: Metadata = {
  title: "Servicios",
  description: "Investigaciones corporativas, debida diligencia, análisis documental y más — con métodos permitidos y fuentes autorizadas.",
};

export default function ServiciosPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-20">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold">Servicios de inteligencia</h1>
        <p className="mt-4 text-lg text-muted">
          Cada servicio se ejecuta conforme a autorización y normativa aplicable, con separación
          estricta entre hechos, fuentes e inferencias.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <Card key={s.slug} className="transition-colors hover:border-cyan/40">
            <ServiceIcon name={s.icon} className="h-6 w-6 text-violet" />
            <CardTitle className="mt-4">{s.title}</CardTitle>
            <CardDescription>{s.description}</CardDescription>
          </Card>
        ))}
      </div>

      <div className="mt-12">
        <ButtonLink href="/solicitud" size="lg">Solicitar evaluación confidencial</ButtonLink>
      </div>
    </div>
  );
}
