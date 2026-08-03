import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Valida el secreto del cron. En modo dev (sin CRON_SECRET) permite el acceso. */
function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

/**
 * Job hash_uploaded_evidence — completa sha256 y sizeBytes de la evidencia recién
 * subida a partir del objeto almacenado. Idempotente.
 */
async function run(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  try {
    const pending = await prisma.evidenceItem.findMany({
      where: { sha256: null },
      take: 50,
    });

    let processed = 0;
    for (const item of pending) {
      if (!item.storageKey) continue;
      const object = await prisma.storedObject.findUnique({ where: { id: item.storageKey } });
      if (!object) continue;
      await prisma.evidenceItem.update({
        where: { id: item.id },
        data: { sha256: object.sha256, sizeBytes: BigInt(object.sizeBytes) },
      });
      processed++;
    }

    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error("[jobs/hash-uploaded-evidence]", err);
    return NextResponse.json({ ok: false, message: "Error interno." }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
