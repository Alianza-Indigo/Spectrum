import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

/**
 * Job generate_report_pdf — reporta las versiones de informe sin PDF. La
 * generación real es on-demand vía el servicio de informes; aquí solo se cuentan
 * los pendientes. Idempotente.
 */
async function run(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const pending = await prisma.reportVersion.findMany({
      where: { pdfStorageKey: null },
      take: 5,
      select: { id: true },
    });

    return NextResponse.json({ ok: true, processed: pending.length });
  } catch (err) {
    console.error("[jobs/generate-report-pdf]", err);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
