import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, created, badRequest, unprocessable } from "@/lib/api";
import { AccessError, requireCaseAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cases/:id/activities — registra una actividad (bitácora inmutable).
 * Las actividades solo se crean; las correcciones se agregan como nuevas filas.
 */
const schema = z.object({
  kind: z.string().min(1),
  content: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("activity:write");
  if ("error" in a) return a.error;
  const { session } = a;
  const { id } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest("Cuerpo de la solicitud no válido.");
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) return unprocessable(parsed.error.flatten().fieldErrors);

  try {
    const current = await requireCaseAccess(session, id);
    const activity = await prisma.activity.create({
      data: {
        organizationId: current.organizationId,
        caseId: id,
        authorUserId: session.userId,
        kind: parsed.data.kind,
        content: parsed.data.content,
      },
    });
    return created(activity);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
