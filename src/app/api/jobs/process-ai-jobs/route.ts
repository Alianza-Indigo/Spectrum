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
 * Job process_ai_jobs — procesamiento reanudable simplificado: toma ejecuciones
 * de IA en cola y las marca como completadas. Idempotente.
 */
async function run(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const queued = await prisma.aiRun.findMany({
      where: { status: "queued" },
      take: 10,
      select: { id: true },
    });

    let processed = 0;
    if (queued.length > 0) {
      const result = await prisma.aiRun.updateMany({
        where: { id: { in: queued.map((r) => r.id) }, status: "queued" },
        data: { status: "done", finishedAt: new Date() },
      });
      processed = result.count;
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error("[jobs/process-ai-jobs]", err);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
