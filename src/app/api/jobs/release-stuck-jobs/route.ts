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

const STUCK_MS = 15 * 60 * 1000;

/**
 * Job release_stuck_jobs — devuelve a la cola las ejecuciones de IA atascadas en
 * estado "running" por más de 15 minutos, para que puedan reintentarse.
 * Idempotente.
 */
async function run(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const result = await prisma.aiRun.updateMany({
      where: {
        status: "running",
        createdAt: { lt: new Date(Date.now() - STUCK_MS) },
      },
      data: { status: "queued" },
    });

    return NextResponse.json({ ok: true, processed: result.count });
  } catch (err) {
    console.error("[jobs/release-stuck-jobs]", err);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
