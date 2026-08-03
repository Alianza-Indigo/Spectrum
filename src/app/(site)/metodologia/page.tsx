import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { process } from "@/config/site";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Metodología",
  description: "Principios de operación de SPECTRUM: legalidad, separación de hechos e inferencias, cadena de custodia y auditoría.",
};

const principles = [
  "Legalidad y autorización documentada.",
  "Separación entre hechos, fuentes, inferencias y conclusiones.",
  "Presunción de incertidumbre cuando la evidencia es incompleta.",
  "Mínimo acceso necesario.",
  "Privacidad por diseño.",
  "Cadena de custodia verificable.",
  "Prohibición de fabricar, alterar u ocultar evidencia.",
  "Toda acción sensible es auditable.",
];

const permitted = [
  "Registros públicos y fuentes abiertas.",
  "Documentación proporcionada lícitamente por el cliente.",
  "Entrevistas y comunicaciones autorizadas.",
  "Observación documentada de forma lícita.",
  "Análisis documental y cruce de datos autorizados.",
];

const prohibited = [
  "Hackear cuentas, dispositivos o sistemas.",
  "Suplantación o engaño ilícito.",
  "Interceptar comunicaciones.",
  "Instalar spyware o malware.",
  "Acceder a bases restringidas sin autorización.",
  "Reconocimiento facial para identificar personas.",
];

export default function MetodologiaPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-20">
      <div className="max-w-2xl">
        <Badge tone="cyan" className="mb-5">Cómo trabajamos</Badge>
        <h1 className="text-4xl font-semibold">Metodología y principios</h1>
        <p className="mt-4 text-lg text-muted">
          La plataforma existe para organizar información lícita, preservar evidencia y entregar
          informes profesionales auditables. La IA asiste el análisis; no decide culpabilidad ni identidad.
        </p>
      </div>

      {/* Proceso */}
      <div className="mt-14">
        <h2 className="text-2xl font-semibold">El expediente, paso a paso</h2>
        <ol className="mt-6 space-y-4">
          {process.map((p) => (
            <li key={p.step}>
              <Card className="flex items-start gap-4 p-5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo to-violet text-sm font-semibold text-white">
                  {p.step}
                </span>
                <div>
                  <h3 className="font-semibold text-foreground">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted">{p.detail}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </div>

      {/* Principios */}
      <div className="mt-14">
        <h2 className="text-2xl font-semibold">Principios de operación</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {principles.map((p) => (
            <li key={p} className="flex items-start gap-3 text-sm text-muted">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
      </div>

      {/* Permitido vs prohibido */}
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <CheckCircle2 className="h-5 w-5 text-success" aria-hidden /> Métodos permitidos
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            {permitted.map((p) => (<li key={p}>· {p}</li>))}
          </ul>
        </Card>
        <Card>
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <XCircle className="h-5 w-5 text-danger" aria-hidden /> Métodos prohibidos
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            {prohibited.map((p) => (<li key={p}>· {p}</li>))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
