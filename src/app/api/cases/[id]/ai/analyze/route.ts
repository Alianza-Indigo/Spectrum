import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, created, badRequest, unprocessable } from "@/lib/api";
import { AccessError } from "@/lib/auth/guards";
import { runCaseAi } from "@/lib/services/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/cases/:id/ai/analyze — análisis asistido (borrador para revisión). */
const schema = z.object({
  input: z.string().min(1),
  inputDocs: z.array(z.string()).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("ai:run");
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
    const result = await runCaseAi(session, id, "analyze", parsed.data.input, parsed.data.inputDocs);
    return created(result);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
