import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, created, unprocessable, notFoundJson } from "@/lib/api";
import { AccessError, orgScope } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { createDelivery, createAccessLink } from "@/lib/services/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/reports/:id/deliver — prepara una entrega controlada del informe.
 * Opcionalmente genera un enlace de acceso si se indica un destinatario.
 */
const schema = z.object({
  requireMfa: z.boolean().optional(),
  watermark: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
  recipient: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("delivery:manage");
  if ("error" in a) return a.error;
  const { session } = a;
  const { id } = await params;

  const json = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(json ?? {});
  if (!parsed.success) return unprocessable(parsed.error.flatten().fieldErrors);

  try {
    const report = await prisma.report.findFirst({ where: { id, ...orgScope(session) } });
    if (!report) return notFoundJson();

    const delivery = await createDelivery(session, report.caseId, {
      reportId: id,
      requireMfa: parsed.data.requireMfa,
      watermark: parsed.data.watermark,
      expiresAt: parsed.data.expiresAt ?? null,
    });

    let url: string | undefined;
    if (parsed.data.recipient) {
      const link = await createAccessLink(session, delivery.id, parsed.data.recipient);
      url = link.url;
    }

    return created({ deliveryId: delivery.id, url });
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
