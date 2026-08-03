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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Job backup_audit_export — cuenta los eventos de auditoría de las últimas 24h
 * (punto de integración para exportación/respaldo externo). Idempotente.
 */
async function run(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const processed = await prisma.auditLog.count({
      where: { createdAt: { gte: new Date(Date.now() - DAY_MS) } },
    });

    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error("[jobs/backup-audit-export]", err);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
