import { NextResponse } from "next/server";
import { authorize, ok } from "@/lib/api";
import { AccessError } from "@/lib/auth/guards";
import { revokeDelivery } from "@/lib/services/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/deliveries/:id/revoke — revoca una entrega y sus enlaces de acceso. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("delivery:manage");
  if ("error" in a) return a.error;
  const { session } = a;
  const { id } = await params;

  try {
    const delivery = await revokeDelivery(session, id);
    return ok(delivery);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
