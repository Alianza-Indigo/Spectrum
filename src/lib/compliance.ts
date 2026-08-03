/**
 * Reglas de cumplimiento (compliance) de SPECTRUM.
 *
 * SPECTRUM organiza información obtenida LÍCITAMENTE. Estas reglas señalan
 * solicitudes cuyo objetivo aparente implica métodos prohibidos (acceso no
 * autorizado, vigilancia intrusiva, suplantación, interceptación, malware,
 * extracción clandestina). No sustituyen el criterio humano: marcan para
 * revisión/escalamiento y pueden bloquear la aceptación automática.
 *
 * La detección es heurística y deliberadamente conservadora: ante la duda,
 * se escala a la persona responsable (art. 10 del PRD).
 */

export type ComplianceFlag = {
  category:
    | "unauthorized_access"
    | "surveillance"
    | "impersonation"
    | "interception"
    | "malware"
    | "clandestine"
    | "facial_recognition";
  term: string;
};

const PATTERNS: { category: ComplianceFlag["category"]; terms: string[] }[] = [
  {
    category: "unauthorized_access",
    terms: ["hackear", "hackeo", "acceso no autorizado", "entrar a la cuenta", "contraseña de", "vulnerar", "romper la seguridad"],
  },
  {
    category: "surveillance",
    terms: ["espiar", "espionaje", "vigilar en secreto", "seguir sin que se entere", "rastrear el teléfono", "ubicación en tiempo real sin consentimiento"],
  },
  {
    category: "impersonation",
    terms: ["suplantar", "hacerme pasar por", "fingir ser", "identidad falsa", "engañar para obtener"],
  },
  {
    category: "interception",
    terms: ["interceptar", "intervenir el teléfono", "grabar llamadas sin", "leer los mensajes de", "pinchar el teléfono"],
  },
  {
    category: "malware",
    terms: ["spyware", "malware", "instalar un programa espía", "keylogger", "troyano"],
  },
  {
    category: "clandestine",
    terms: ["clandestino", "de forma encubierta ilegal", "extraer sin permiso", "robar información"],
  },
  {
    category: "facial_recognition",
    terms: ["reconocimiento facial", "identificar por la cara", "reconocer el rostro"],
  },
];

/** Normaliza texto: minúsculas y sin acentos, para una comparación robusta. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Analiza texto libre y devuelve las banderas de cumplimiento detectadas. */
export function screenText(text: string): ComplianceFlag[] {
  const haystack = normalize(text);
  const flags: ComplianceFlag[] = [];
  for (const { category, terms } of PATTERNS) {
    for (const term of terms) {
      if (haystack.includes(normalize(term))) {
        flags.push({ category, term });
      }
    }
  }
  return flags;
}

/**
 * ¿Debe bloquearse la aceptación automática de una solicitud/caso?
 * Cualquier bandera detectada obliga a revisión humana antes de continuar.
 */
export function shouldBlock(text: string): boolean {
  return screenText(text).length > 0;
}

export const complianceLabels: Record<ComplianceFlag["category"], string> = {
  unauthorized_access: "Acceso no autorizado",
  surveillance: "Vigilancia intrusiva",
  impersonation: "Suplantación / engaño",
  interception: "Interceptación de comunicaciones",
  malware: "Software espía / malware",
  clandestine: "Extracción clandestina",
  facial_recognition: "Reconocimiento facial",
};
