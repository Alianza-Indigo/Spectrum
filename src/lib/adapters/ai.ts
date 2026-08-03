/**
 * Adaptador de IA asistida.
 *
 * - Con `AI_DEFAULT_PROVIDER=anthropic` y `ANTHROPIC_API_KEY`, usa la API de
 *   Anthropic (Messages) mediante fetch, con un sistema que impone los límites
 *   del PRD (la IA no afirma delitos, no identifica personas, no presenta
 *   inferencias como hechos, etc.).
 * - Sin credenciales, funciona en modo autocontenido con heurísticas locales
 *   deterministas. En AMBOS casos el resultado es un BORRADOR marcado que
 *   requiere revisión humana.
 *
 * La plataforma funciona por completo con la IA desactivada.
 */

export type AiOperation = "summarize" | "analyze" | "extract_entities" | "timeline" | "questions";

export const PROMPT_VERSIONS: Record<AiOperation, string> = {
  summarize: "summarize@v1",
  analyze: "analyze@v1",
  extract_entities: "extract_entities@v1",
  timeline: "timeline@v1",
  questions: "questions@v1",
};

const SYSTEM_PROMPT = [
  "Eres un asistente de análisis para una agencia de inteligencia privada que opera de forma lícita.",
  "Reglas estrictas: no afirmes que alguien cometió un delito; no identifiques personas por rasgos físicos;",
  "no infieras emociones, intención o peligrosidad como hechos; no presentes inferencias como hechos;",
  "distingue siempre HECHO, DECLARACIÓN e INFERENCIA; señala incertidumbre cuando la evidencia sea incompleta.",
  "Tu salida es un BORRADOR para revisión humana.",
].join(" ");

export type AiResult = {
  content: string;
  provider: string;
  model: string;
  promptVersion: string;
  warnings: string;
};

const OP_INSTRUCTIONS: Record<AiOperation, string> = {
  summarize: "Resume el siguiente material en viñetas claras, separando hechos de interpretaciones.",
  analyze: "Analiza el material y señala inconsistencias textuales, vacíos y preguntas abiertas.",
  extract_entities: "Extrae fechas, nombres de personas y organizaciones para revisión humana (no confirmes identidades).",
  timeline: "Propón una línea de tiempo tentativa a partir de las fechas mencionadas.",
  questions: "Sugiere preguntas de investigación pertinentes y líneas a verificar.",
};

export async function runAi(operation: AiOperation, input: string): Promise<AiResult> {
  const provider = process.env.AI_DEFAULT_PROVIDER ?? "local";
  const model = process.env.AI_DEFAULT_MODEL ?? "local-heuristic";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const warnings = "Borrador generado por IA. Requiere verificación humana. No constituye una conclusión ni una afirmación de hechos.";

  if (provider === "anthropic" && apiKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: `${OP_INSTRUCTIONS[operation]}\n\n---\n${input}` }],
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { content?: { text?: string }[] };
        const content = data.content?.map((c) => c.text ?? "").join("\n").trim() || "(sin contenido)";
        return { content, provider: "anthropic", model, promptVersion: PROMPT_VERSIONS[operation], warnings };
      }
      console.error("[ai] respuesta no OK de Anthropic:", res.status);
    } catch (err) {
      console.error("[ai] fallo al invocar Anthropic:", err);
    }
    // Si falla, degradamos al modo local sin interrumpir la operación.
  }

  return {
    content: localHeuristic(operation, input),
    provider: "local",
    model: "local-heuristic",
    promptVersion: PROMPT_VERSIONS[operation],
    warnings: `${warnings} (Generado en modo local sin proveedor de IA externo.)`,
  };
}

// --- Heurísticas locales deterministas (modo autocontenido) -----------------

function localHeuristic(operation: AiOperation, input: string): string {
  const text = input.trim();
  switch (operation) {
    case "summarize": {
      const sentences = text.split(/(?<=[.?!])\s+/).filter(Boolean).slice(0, 5);
      return ["Resumen (borrador):", ...sentences.map((s) => `• ${s}`)].join("\n");
    }
    case "analyze": {
      const notes: string[] = [];
      if (/\b(siempre|nunca|todos|nadie)\b/i.test(text)) notes.push("• Se detectan afirmaciones absolutas que conviene matizar.");
      if (findDates(text).length > 1) notes.push("• Hay múltiples fechas; verificar coherencia cronológica.");
      if (text.length < 120) notes.push("• Material breve: evidencia posiblemente incompleta (presunción de incertidumbre).");
      if (notes.length === 0) notes.push("• Sin inconsistencias evidentes en una lectura superficial. Requiere verificación humana.");
      return ["Análisis (borrador):", ...notes].join("\n");
    }
    case "extract_entities": {
      const dates = findDates(text);
      const names = findProperNouns(text);
      return [
        "Entidades detectadas (borrador, sin confirmar identidades):",
        `• Fechas: ${dates.join(", ") || "—"}`,
        `• Nombres propios candidatos: ${names.join(", ") || "—"}`,
      ].join("\n");
    }
    case "timeline": {
      const dates = findDates(text);
      return ["Línea de tiempo tentativa (borrador):", ...(dates.length ? dates.map((d) => `• ${d}: evento por precisar`) : ["• No se detectaron fechas."])].join("\n");
    }
    case "questions": {
      return [
        "Preguntas de investigación sugeridas (borrador):",
        "• ¿Qué fuentes autorizadas pueden corroborar los hechos mencionados?",
        "• ¿Existen documentos que respalden cada afirmación clave?",
        "• ¿Qué interpretaciones alternativas son compatibles con la evidencia?",
      ].join("\n");
    }
  }
}

function findDates(text: string): string[] {
  const re = /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+de\s+[a-zé]+(?:\s+de\s+\d{4})?)\b/gi;
  return Array.from(new Set((text.match(re) ?? []).map((s) => s.trim())));
}

function findProperNouns(text: string): string[] {
  const re = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,2})\b/g;
  return Array.from(new Set((text.match(re) ?? []))).slice(0, 12);
}
