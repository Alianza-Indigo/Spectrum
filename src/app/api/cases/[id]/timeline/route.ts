import { NextResponse } from "next/server";
import { z } from "zod";
import { TimelinePrecision, TimelineKind } from "@prisma/client";
import { authorize, ok, created, badRequest, unprocessable } from "@/lib/api";
import { AccessError, requireCaseAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/cases/:id/timeline — eventos de la línea de tiempo (por occurredAt).
 * POST /api/cases/:id/timeline — agrega un evento a la línea de tiempo.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("case:read_assigned");
  if ("error" in a) return a.error;
  const { session } = a;
  const { id } = await params;

  try {
    await requireCaseAccess(session, id);
    const events = await prisma.timelineEvent.findMany({
      where: { caseId: id },
      orderBy: { occurredAt: "asc" },
    });
    return ok(events);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  occurredAt: z.coerce.date().optional(),
  precision: z.nativeEnum(TimelinePrecision).optional(),
  kind: z.nativeEnum(TimelineKind).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("finding:write");
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
    const event = await prisma.timelineEvent.create({
      data: {
        organizationId: current.organizationId,
        caseId: id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        occurredAt: parsed.data.occurredAt ?? null,
        precision: parsed.data.precision ?? "EXACT",
        kind: parsed.data.kind ?? "FACT",
      },
    });
    return created(event);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
