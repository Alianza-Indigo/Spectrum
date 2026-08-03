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
 * Job retention_review — detecta expedientes CERRADO cuyo periodo de retención
 * ha vencido (closedAt + retainDays < now) y crea una notificación de revisión
 * para la organización, evitando duplicados recientes. Idempotente.
 */
async function run(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const now = Date.now();
    const cases = await prisma.case.findMany({
      where: {
        status: "CERRADO",
        retentionPolicyId: { not: null },
        closedAt: { not: null },
      },
      include: { retentionPolicy: true },
    });

    let processed = 0;
    for (const c of cases) {
      if (!c.closedAt || !c.retentionPolicy) continue;
      const expiresAt = c.closedAt.getTime() + c.retentionPolicy.retainDays * DAY_MS;
      if (expiresAt >= now) continue;

      const title = `Revisión de retención: ${c.folio}`;
      const existing = await prisma.notification.findFirst({
        where: {
          organizationId: c.organizationId,
          kind: "retention",
          title,
          createdAt: { gte: new Date(now - 30 * DAY_MS) },
        },
      });
      if (existing) continue;

      await prisma.notification.create({
        data: {
          organizationId: c.organizationId,
          kind: "retention",
          title,
          body: `El expediente ${c.folio} superó su periodo de retención y requiere revisión (${c.retentionPolicy.actionOnExpiry}).`,
        },
      });
      processed++;
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error("[jobs/retention-review]", err);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
