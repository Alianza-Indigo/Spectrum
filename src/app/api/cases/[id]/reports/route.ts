import { NextResponse } from "next/server";
import { z } from "zod";
import { ReportType } from "@prisma/client";
import { authorize, created, badRequest, unprocessable } from "@/lib/api";
import { AccessError } from "@/lib/auth/guards";
import { createReport } from "@/lib/services/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/cases/:id/reports — crea un informe con su primera versión. */
const schema = z.object({
  type: z.nativeEnum(ReportType),
  title: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("report:write");
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
    const report = await createReport(session, id, parsed.data.type, parsed.data.title);
    return created(report);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
