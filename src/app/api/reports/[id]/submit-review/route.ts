import { NextResponse } from "next/server";
import { authorize, ok } from "@/lib/api";
import { AccessError } from "@/lib/auth/guards";
import { setReportStatus } from "@/lib/services/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/reports/:id/submit-review — envía el informe a revisión (IN_REVIEW). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("report:write");
  if ("error" in a) return a.error;
  const { session } = a;
  const { id } = await params;

  try {
    const report = await setReportStatus(session, id, "IN_REVIEW");
    return ok(report);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
