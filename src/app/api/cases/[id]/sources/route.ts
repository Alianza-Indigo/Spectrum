import { NextResponse } from "next/server";
import { z } from "zod";
import { SourceType, Reliability } from "@prisma/client";
import { authorize, created, badRequest, unprocessable } from "@/lib/api";
import { AccessError, requireCaseAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/cases/:id/sources — registra una fuente consultada. */
const schema = z.object({
  type: z.nativeEnum(SourceType),
  origin: z.string().min(1),
  method: z.string().optional(),
  consultedAt: z.coerce.date().optional(),
  responsible: z.string().optional(),
  reliability: z.nativeEnum(Reliability).optional(),
  restrictions: z.string().optional(),
  reference: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("source:write");
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
    const source = await prisma.source.create({
      data: {
        organizationId: current.organizationId,
        caseId: id,
        type: parsed.data.type,
        origin: parsed.data.origin,
        method: parsed.data.method ?? null,
        consultedAt: parsed.data.consultedAt ?? null,
        responsible: parsed.data.responsible ?? null,
        reliability: parsed.data.reliability ?? "UNKNOWN",
        restrictions: parsed.data.restrictions ?? null,
        reference: parsed.data.reference ?? null,
      },
    });
    return created(source);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
