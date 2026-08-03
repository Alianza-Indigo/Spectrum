export const site = {
  name: "SPECTRUM",
  fullName: "SPECTRUM Agencia de Inteligencia",
  tagline: "Inteligencia para revelar lo que los hechos permiten demostrar",
  description:
    "Plataforma profesional para gestión de investigaciones privadas, inteligencia corporativa, debida diligencia y análisis documental — con información obtenida lícitamente, trazabilidad y discreción.",
  legalNotice:
    "Cada investigación se realiza conforme a autorización y normativa aplicable. SPECTRUM organiza información obtenida lícitamente; no realiza espionaje, intrusión ni acceso clandestino.",
} as const;

export const nav = [
  { href: "/servicios", label: "Servicios" },
  { href: "/metodologia", label: "Metodología" },
  { href: "/#sectores", label: "Sectores" },
  { href: "/#faq", label: "Preguntas frecuentes" },
] as const;

export const services = [
  {
    slug: "corporate",
    title: "Investigaciones corporativas",
    description: "Análisis de riesgos, conflictos y conductas internas con información lícita y verificable.",
    icon: "building",
  },
  {
    slug: "due_diligence",
    title: "Debida diligencia",
    description: "Verificación societaria, reputacional y de integridad de terceros antes de una relación de negocio.",
    icon: "shield-check",
  },
  {
    slug: "background_check",
    title: "Verificación de antecedentes",
    description: "Confirmación de historial con fuentes autorizadas y registros públicos.",
    icon: "file-search",
  },
  {
    slug: "asset_investigation",
    title: "Investigación patrimonial",
    description: "Identificación de bienes y estructura empresarial a partir de información lícita.",
    icon: "landmark",
  },
  {
    slug: "person_location",
    title: "Localización de personas",
    description: "Ubicación de personas conforme a la ley y con base legítima documentada.",
    icon: "map-pin",
  },
  {
    slug: "fraud_internal",
    title: "Fraudes y conflictos internos",
    description: "Investigación documental de fraudes, desvíos y conflictos de interés.",
    icon: "alert-triangle",
  },
  {
    slug: "competitive_intelligence",
    title: "Inteligencia competitiva ética",
    description: "Análisis de mercado y competidores con fuentes abiertas y métodos permitidos.",
    icon: "radar",
  },
  {
    slug: "document_analysis",
    title: "Análisis documental",
    description: "Revisión, comparación y estructuración de expedientes y documentación compleja.",
    icon: "files",
  },
  {
    slug: "reputational_risk",
    title: "Riesgos reputacionales",
    description: "Evaluación de exposición reputacional y presencia pública.",
    icon: "eye",
  },
  {
    slug: "legal_support",
    title: "Apoyo a estrategias legales",
    description: "Soporte documental para equipos jurídicos, sin sustituir la asesoría legal.",
    icon: "scale",
  },
] as const;

export const process = [
  { step: 1, title: "Solicitud confidencial", detail: "Recibimos tu solicitud y evaluamos su viabilidad legal y operativa." },
  { step: 2, title: "Autorización y alcance", detail: "Documentamos base legítima, autorización y límites del encargo." },
  { step: 3, title: "Plan de investigación", detail: "Definimos preguntas, hipótesis, fuentes autorizadas y métodos permitidos." },
  { step: 4, title: "Recolección lícita y análisis", detail: "Registramos actividades, fuentes, hallazgos y evidencia con cadena de custodia." },
  { step: 5, title: "Informe y entrega controlada", detail: "Entregamos un informe revisable y auditable mediante portal privado." },
] as const;

export const sectors = [
  "Corporativo y consejos de administración",
  "Firmas legales",
  "Banca y seguros",
  "Cumplimiento y auditoría",
  "Recursos humanos",
  "Fondos e inversión",
  "Retail y cadenas de suministro",
  "Particulares con asesoría legal",
] as const;

export const faqs = [
  {
    q: "¿SPECTRUM realiza espionaje o accesos clandestinos?",
    a: "No. SPECTRUM organiza y documenta información obtenida de forma lícita. No hackeamos cuentas ni dispositivos, no interceptamos comunicaciones, no instalamos software espía ni suplantamos identidades.",
  },
  {
    q: "¿Qué necesito para iniciar una investigación?",
    a: "Una base legítima y la autorización para proporcionar la información del caso. Evaluamos cada solicitud antes de aceptarla y podemos escalar cualquier duda legal al responsable designado.",
  },
  {
    q: "¿Cómo protegen la confidencialidad?",
    a: "Aislamiento por organización y expediente, control de accesos por rol, almacenamiento privado, enlaces de entrega con expiración y auditoría completa de accesos y descargas.",
  },
  {
    q: "¿Los informes determinan culpabilidad?",
    a: "No. Los informes separan hechos, fuentes, inferencias y conclusiones limitadas al alcance. No determinamos culpabilidad ni responsabilidad penal; eso corresponde a la autoridad competente.",
  },
  {
    q: "¿Usan inteligencia artificial?",
    a: "La IA asiste el análisis (resúmenes, líneas de tiempo, detección de inconsistencias) siempre con revisión humana y registro auditable. La IA no decide culpabilidad ni identidad, y la plataforma funciona aun con la IA desactivada.",
  },
] as const;
