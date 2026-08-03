import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Generación de informes PDF profesionales con pdf-lib (sin dependencias
 * nativas; compatible con serverless). El documento diferencia visualmente
 * hechos, declaraciones, inferencias y conclusiones, e incluye portada SPECTRUM,
 * control de versión y declaración de uso confidencial.
 */

export type ReportSectionInput = {
  heading: string;
  body?: string | null;
  kind?: string; // narrative | facts | findings | timeline | annex | inference | conclusion
};

export type ReportPdfInput = {
  title: string;
  folio: string;
  clientName?: string | null;
  scope?: string | null;
  limitations?: string | null;
  version: number;
  generatedAt: Date;
  confidentiality: string;
  sections: ReportSectionInput[];
};

const MARGIN = 56;
const PAGE = { w: 595.28, h: 841.89 }; // A4
const INK = rgb(0.09, 0.1, 0.14);
const MUTED = rgb(0.42, 0.46, 0.52);
const INDIGO = rgb(0.39, 0.4, 0.95);

const kindLabel: Record<string, string> = {
  facts: "HECHOS DOCUMENTADOS",
  findings: "HALLAZGOS",
  timeline: "LÍNEA DE TIEMPO",
  inference: "INFERENCIAS",
  conclusion: "CONCLUSIONES",
  annex: "ANEXOS",
  narrative: "",
};

export async function buildReportPdf(input: ReportPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${input.title} · ${input.folio}`);
  doc.setProducer("SPECTRUM Agencia de Inteligencia");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: LayoutCtx = { doc, font, bold, page: doc.addPage([PAGE.w, PAGE.h]), y: 0, input };
  ctx.y = PAGE.h - MARGIN;

  drawCover(ctx);
  ctx.page = doc.addPage([PAGE.w, PAGE.h]);
  ctx.y = PAGE.h - MARGIN;

  for (const section of input.sections) {
    drawSection(ctx, section);
  }

  // Numeración y pie confidencial en todas las páginas.
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`SPECTRUM · ${input.folio} · v${input.version}`, { x: MARGIN, y: 28, size: 8, font, color: MUTED });
    p.drawText(`Página ${i + 1} de ${pages.length}`, { x: PAGE.w - MARGIN - 70, y: 28, size: 8, font, color: MUTED });
    p.drawText("USO CONFIDENCIAL", { x: PAGE.w / 2 - 34, y: 28, size: 8, font: bold, color: MUTED });
  });

  return doc.save();
}

type LayoutCtx = {
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  page: PDFPage;
  y: number;
  input: ReportPdfInput;
};

function drawCover(ctx: LayoutCtx) {
  const { page, bold, font, input } = ctx;
  page.drawRectangle({ x: 0, y: PAGE.h - 6, width: PAGE.w, height: 6, color: INDIGO });
  page.drawText("SPECTRUM", { x: MARGIN, y: PAGE.h - 140, size: 34, font: bold, color: INK });
  page.drawText("Agencia de Inteligencia", { x: MARGIN, y: PAGE.h - 164, size: 12, font, color: MUTED });

  let y = PAGE.h - 260;
  page.drawText(input.title, { x: MARGIN, y, size: 20, font: bold, color: INK });
  y -= 40;

  const rows: [string, string][] = [
    ["Folio", input.folio],
    ["Cliente", input.clientName ?? "—"],
    ["Versión", `v${input.version}`],
    ["Fecha", input.generatedAt.toISOString().slice(0, 10)],
    ["Confidencialidad", input.confidentiality],
  ];
  for (const [k, v] of rows) {
    page.drawText(`${k}:`, { x: MARGIN, y, size: 10, font: bold, color: MUTED });
    page.drawText(v, { x: MARGIN + 110, y, size: 10, font, color: INK });
    y -= 20;
  }

  if (input.scope) {
    y -= 16;
    page.drawText("Alcance", { x: MARGIN, y, size: 11, font: bold, color: INK });
    y -= 16;
    y = wrapText(ctx, input.scope, font, 10, y, INK);
  }
  if (input.limitations) {
    y -= 16;
    page.drawText("Limitaciones", { x: MARGIN, y, size: 11, font: bold, color: INK });
    y -= 16;
    wrapText(ctx, input.limitations, font, 10, y, MUTED);
  }

  page.drawText(
    "Este informe diferencia hechos, declaraciones, inferencias y conclusiones limitadas al alcance.",
    { x: MARGIN, y: 70, size: 8, font, color: MUTED },
  );
}

function ensureSpace(ctx: LayoutCtx, needed: number) {
  if (ctx.y - needed < MARGIN + 20) {
    ctx.page = ctx.doc.addPage([PAGE.w, PAGE.h]);
    ctx.y = PAGE.h - MARGIN;
  }
}

function drawSection(ctx: LayoutCtx, section: ReportSectionInput) {
  ensureSpace(ctx, 60);
  const tag = kindLabel[section.kind ?? "narrative"];
  if (tag) {
    ctx.page.drawText(tag, { x: MARGIN, y: ctx.y, size: 8, font: ctx.bold, color: INDIGO });
    ctx.y -= 14;
  }
  ctx.page.drawText(section.heading, { x: MARGIN, y: ctx.y, size: 14, font: ctx.bold, color: INK });
  ctx.y -= 8;
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y, width: PAGE.w - MARGIN * 2, height: 1, color: rgb(0.85, 0.87, 0.9) });
  ctx.y -= 18;

  if (section.body) {
    for (const paragraph of section.body.split(/\n+/)) {
      if (!paragraph.trim()) continue;
      ensureSpace(ctx, 30);
      ctx.y = wrapText(ctx, paragraph.trim(), ctx.font, 10.5, ctx.y, INK);
      ctx.y -= 8;
    }
  }
  ctx.y -= 14;
}

/** Dibuja texto con ajuste de línea y salto de página; devuelve la nueva `y`. */
function wrapText(ctx: LayoutCtx, text: string, font: PDFFont, size: number, startY: number, color = INK): number {
  const maxWidth = PAGE.w - MARGIN * 2;
  const lineHeight = size * 1.45;
  const words = text.split(/\s+/);
  let line = "";
  let y = startY;

  const flush = () => {
    if (!line) return;
    if (y - lineHeight < MARGIN + 20) {
      ctx.page = ctx.doc.addPage([PAGE.w, PAGE.h]);
      y = PAGE.h - MARGIN;
    }
    ctx.page.drawText(line, { x: MARGIN, y, size, font, color });
    y -= lineHeight;
    line = "";
  };

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
      flush();
      line = word;
    } else {
      line = candidate;
    }
  }
  flush();
  return y;
}
