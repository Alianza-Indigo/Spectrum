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
 * Job expire_delivery_links — marca como EXPIRED las entregas vencidas que aún
 * no están revocadas ni expiradas. Idempotente.
 */
async function run(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const result = await prisma.delivery.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        status: { notIn: ["REVOKED", "EXPIRED"] },
      },
      data: { status: "EXPIRED" },
    });

    return NextResponse.json({ ok: true, processed: result.count });
  } catch (err) {
    console.error("[jobs/expire-delivery-links]", err);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
