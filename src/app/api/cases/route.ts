import { NextResponse } from "next/server";
import { z } from "zod";
import { CaseType } from "@prisma/client";
import { authorize, ok, created, badRequest, unprocessable } from "@/lib/api";
import { AccessError, caseListWhere } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { createCase } from "@/lib/services/cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/cases  — lista de expedientes visibles para la sesión.
 * POST /api/cases  — crea un expediente.
 */
export async function GET() {
  const a = await authorize("case:read");
  if ("error" in a) return a.error;
  const { session } = a;

  const where = await caseListWhere(session);
  const cases = await prisma.case.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, displayName: true } } },
  });
  return ok(cases);
}

const createSchema = z.object({
  internalName: z.string().min(1),
  type: z.nativeEnum(CaseType),
  clientId: z.string().optional(),
  description: z.string().optional(),
  objective: z.string().optional(),
  scope: z.string().optional(),
  exclusions: z.string().optional(),
  jurisdiction: z.string().optional(),
});

export async function POST(request: Request) {
  const a = await authorize("case:create");
  if ("error" in a) return a.error;
  const { session } = a;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest("Cuerpo de la solicitud no válido.");
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return unprocessable(parsed.error.flatten().fieldErrors);

  try {
    const c = await createCase(session, parsed.data);
    return created(c);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
