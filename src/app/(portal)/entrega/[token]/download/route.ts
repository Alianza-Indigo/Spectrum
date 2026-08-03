import { NextResponse } from "next/server";
import {
  resolveDeliveryByToken,
  markDeliveryDownloaded,
} from "@/lib/services/delivery";
import { getReportPdfUrlIfExists } from "@/lib/services/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reasonMessages: Record<string, { message: string; status: number }> = {
  not_found: { message: "Enlace no válido.", status: 404 },
  revoked: { message: "Este acceso fue revocado.", status: 403 },
  expired: { message: "Este enlace ha expirado.", status: 403 },
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const res = await resolveDeliveryByToken(token);

  if (!res.ok) {
    const info = reasonMessages[res.reason] ?? { message: "Enlace no válido.", status: 404 };
    return NextResponse.json({ message: info.message }, { status: info.status });
  }

  const version = res.delivery.report?.versions?.[0];
  if (!version) {
    return NextResponse.json(
      { message: "El informe aún no tiene PDF generado." },
      { status: 409 },
    );
  }

  const url = await getReportPdfUrlIfExists(version.id);
  if (!url) {
    return NextResponse.json(
      { message: "El informe aún no tiene PDF generado." },
      { status: 409 },
    );
  }

  await markDeliveryDownloaded(token);
  return NextResponse.redirect(new URL(url, request.url));
}
