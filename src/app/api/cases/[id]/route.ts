import { NextResponse } from "next/server";
import { z } from "zod";
import { CaseType, ConfidentialityLevel, RiskLevel } from "@prisma/client";
import { authorize, ok, badRequest, unprocessable, notFoundJson } from "@/lib/api";
import { AccessError, requireCaseAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET   /api/cases/:id  — detalle del expediente con relaciones básicas.
 * PATCH /api/cases/:id  — actualización parcial de campos editables.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("case:read_assigned");
  if ("error" in a) return a.error;
  const { session } = a;
  const { id } = await params;

  try {
    await requireCaseAccess(session, id);
    const c = await prisma.case.findUnique({
      where: { id },
      include: {
        client: true,
        assignments: true,
        _count: { select: { tasks: true, evidence: true, findings: true, sources: true, reports: true } },
      },
    });
    if (!c) return notFoundJson();
    return ok(c);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}

const patchSchema = z
  .object({
    internalName: z.string().min(1),
    clientId: z.string().nullable(),
    type: z.nativeEnum(CaseType),
    description: z.string().nullable(),
    objective: z.string().nullable(),
    scope: z.string().nullable(),
    exclusions: z.string().nullable(),
    jurisdiction: z.string().nullable(),
    confidentiality: z.nativeEnum(ConfidentialityLevel),
    operationalRisk: z.nativeEnum(RiskLevel),
    legalRisk: z.nativeEnum(RiskLevel),
    dueAt: z.coerce.date().nullable(),
  })
  .partial();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("case:update");
  if ("error" in a) return a.error;
  const { session } = a;
  const { id } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest("Cuerpo de la solicitud no válido.");
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return unprocessable(parsed.error.flatten().fieldErrors);

  try {
    await requireCaseAccess(session, id);
    const updated = await prisma.case.update({ where: { id }, data: parsed.data });
    return ok(updated);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
