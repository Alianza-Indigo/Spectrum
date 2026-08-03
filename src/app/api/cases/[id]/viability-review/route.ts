import { NextResponse } from "next/server";
import { z } from "zod";
import { ViabilityDecision } from "@prisma/client";
import { authorize, created, badRequest, unprocessable } from "@/lib/api";
import { AccessError } from "@/lib/auth/guards";
import { recordViability } from "@/lib/services/cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/cases/:id/viability-review — registra un análisis de viabilidad. */
const schema = z.object({
  requestedObjective: z.string().min(1),
  legitimateBasis: z.string().optional(),
  risksToThirdParties: z.string().optional(),
  conflictsOfInterest: z.string().optional(),
  jurisdiction: z.string().optional(),
  plannedSources: z.string().optional(),
  prohibitedSources: z.string().optional(),
  requiresLegalAdvice: z.boolean().optional(),
  decision: z.nativeEnum(ViabilityDecision),
  decisionReason: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("case:viability");
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
    const result = await recordViability(session, id, parsed.data);
    return created(result);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
