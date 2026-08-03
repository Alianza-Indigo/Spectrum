import type { Metadata } from "next";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Aviso legal y privacidad",
  description: "Marco de operación lícita, confidencialidad y tratamiento de datos de SPECTRUM.",
};

const sections = [
  {
    h: "Alcance de nuestros servicios",
    p: `${site.fullName} organiza información obtenida de forma lícita, documenta fuentes, preserva evidencia y entrega informes profesionales auditables. No realizamos espionaje, acceso clandestino, interceptación de comunicaciones, suplantación ni instalación de software espía.`,
  },
  {
    h: "Autorización y base legítima",
    p: "Cada investigación requiere una base legítima y autorización documentada cuando corresponde. Evaluamos la viabilidad legal y operativa de cada solicitud antes de aceptarla y escalamos cualquier duda al responsable designado.",
  },
  {
    h: "Confidencialidad",
    p: "Protegemos la confidencialidad de clientes, expedientes, personas investigadas, fuentes, evidencias y comunicaciones internas, mediante aislamiento por organización y expediente, control de accesos por rol y almacenamiento privado.",
  },
  {
    h: "Tratamiento de datos personales",
    p: "El formulario de solicitud recaba únicamente los datos necesarios para una evaluación inicial. No solicitamos información altamente sensible ni documentos completos en esta etapa; la agencia determina posteriormente el canal seguro apropiado. Los datos se conservan conforme a la política de retención aplicable y pueden eliminarse a solicitud según la normativa vigente.",
  },
  {
    h: "Límites",
    p: "Nuestros informes no determinan culpabilidad, responsabilidad penal ni condición médica, y no sustituyen la asesoría legal, el peritaje oficial ni a la autoridad investigadora. Diferencian de forma explícita hechos, declaraciones, inferencias y conclusiones limitadas al alcance contratado.",
  },
  {
    h: "Seguridad",
    p: "Aplicamos cifrado en tránsito y en reposo cuando está disponible, autenticación multifactor para administradores, enlaces de entrega con expiración, y auditoría de accesos, descargas, exportaciones y cambios.",
  },
];

export default function AvisoLegalPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20">
      <h1 className="text-4xl font-semibold">Aviso legal y privacidad</h1>
      <p className="mt-4 text-muted">{site.legalNotice}</p>
      <div className="mt-12 space-y-10">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-xl font-semibold text-foreground">{s.h}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
