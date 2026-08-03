import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, created, badRequest, unprocessable } from "@/lib/api";
import { AccessError, requireCaseAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cases/:id/plan — crea una nueva versión del plan de investigación.
 * Cada envío incrementa la versión (histórico versionado, no sobrescribe).
 */
const schema = z.object({
  scope: z.string().optional(),
  limits: z.string().optional(),
  authorizedSources: z.string().optional(),
  allowedMethods: z.string().optional(),
  prohibitedMethods: z.string().optional(),
  sufficiencyCriteria: z.string().optional(),
  risksAndControls: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const parsed = schema.safeParse(json);
  if (!parsed.success) return unprocessable(parsed.error.flatten().fieldErrors);

  try {
    await requireCaseAccess(session, id);
    const latest = await prisma.investigationPlan.findFirst({
      where: { caseId: id },
      orderBy: { version: "desc" },
    });
    const plan = await prisma.investigationPlan.create({
      data: {
        caseId: id,
        version: (latest?.version ?? 0) + 1,
        scope: parsed.data.scope ?? null,
        limits: parsed.data.limits ?? null,
        authorizedSources: parsed.data.authorizedSources ?? null,
        allowedMethods: parsed.data.allowedMethods ?? null,
        prohibitedMethods: parsed.data.prohibitedMethods ?? null,
        sufficiencyCriteria: parsed.data.sufficiencyCriteria ?? null,
        risksAndControls: parsed.data.risksAndControls ?? null,
        createdByUser: session.userId,
      },
    });
    return created(plan);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
