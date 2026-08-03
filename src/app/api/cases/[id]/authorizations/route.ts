import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, created, badRequest, unprocessable } from "@/lib/api";
import { AccessError } from "@/lib/auth/guards";
import { addAuthorization } from "@/lib/services/cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/cases/:id/authorizations — registra una autorización del expediente. */
const schema = z.object({
  kind: z.string().min(1),
  description: z.string().min(1),
  grantedBy: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("case:authorize");
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
    const auth = await addAuthorization(session, id, parsed.data);
    return created(auth);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
