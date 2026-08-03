import type { Metadata } from "next";
import { InquiryForm } from "@/components/site/inquiry-form";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Solicitar evaluación confidencial",
  description: "Cuéntanos de forma general tu asunto. Evaluaremos su viabilidad legal y operativa con total discreción.",
};

export default function SolicitudPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold">Solicitar evaluación confidencial</h1>
        <p className="mt-4 text-muted">
          Comparte una descripción general del asunto. Evaluaremos su viabilidad legal y operativa
          antes de proponer cómo continuar. En esta etapa <strong className="text-foreground">no</strong> solicitamos
          documentos ni información altamente sensible.
        </p>
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-cyan/20 bg-cyan/5 px-4 py-3 text-sm text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan" aria-hidden />
          Cada investigación se realiza conforme a autorización y normativa aplicable. Las solicitudes
          que impliquen métodos prohibidos no serán aceptadas.
        </p>
      </div>
      <InquiryForm />
    </div>
  );
}
