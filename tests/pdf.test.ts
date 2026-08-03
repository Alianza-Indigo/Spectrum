import { describe, it, expect } from "vitest";
import { buildReportPdf } from "@/lib/pdf/report";

describe("Generación de informe PDF", () => {
  it("produce un PDF válido con las secciones", async () => {
    const bytes = await buildReportPdf({
      title: "Informe de prueba",
      folio: "SPX-TEST2345",
      clientName: "Cliente Demo",
      scope: "Alcance de prueba con texto suficiente para forzar el ajuste de línea en el documento generado.",
      limitations: "No determina culpabilidad.",
      version: 1,
      generatedAt: new Date("2026-08-03T00:00:00Z"),
      confidentiality: "Sensible",
      sections: [
        { heading: "Resumen ejecutivo", body: "Contenido de resumen.", kind: "narrative" },
        { heading: "Hechos documentados", body: "• Hecho uno\n• Hecho dos", kind: "facts" },
        { heading: "Conclusiones", body: "Conclusión limitada al alcance.", kind: "conclusion" },
      ],
    });

    expect(bytes.byteLength).toBeGreaterThan(500);
    const head = new TextDecoder().decode(bytes.slice(0, 8));
    expect(head.startsWith("%PDF-")).toBe(true);
    const tail = new TextDecoder().decode(bytes.slice(-6));
    expect(tail.includes("EOF")).toBe(true);
  });
});
