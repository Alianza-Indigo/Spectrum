import { NextResponse } from "next/server";
import { z } from "zod";
import { ConfidenceLevel } from "@prisma/client";
import { authorize, created, badRequest, unprocessable } from "@/lib/api";
import { AccessError } from "@/lib/auth/guards";
import { createFinding } from "@/lib/services/findings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/cases/:id/findings — registra un hallazgo (requiere fuente/evidencia). */
const schema = z.object({
  observedFact: z.string().min(1),
  sourceId: z.string().optional(),
  evidenceId: z.string().optional(),
  factDate: z.coerce.date().optional(),
  confidence: z.nativeEnum(ConfidenceLevel).optional(),
  interpretation: z.string().optional(),
  alternatives: z.string().optional(),
  errorRisk: z.string().optional(),
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
    const finding = await createFinding(session, id, parsed.data);
    return created(finding);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
