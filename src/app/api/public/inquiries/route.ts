import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { inquirySchema } from "@/lib/validation/inquiry";
import { screenText } from "@/lib/compliance";
import { recordAudit, clientIp } from "@/lib/audit";
import { sha256Hex } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/public/inquiries
 * Recibe una solicitud de evaluación del sitio público.
 *
 * - Valida entrada (Zod) → 422 con fieldErrors.
 * - Aplica rate limiting por IP → 429.
 * - Realiza screening de cumplimiento: si el asunto sugiere métodos prohibidos,
 *   la solicitud se marca para triage humano (no se acepta automáticamente) y se
 *   audita, sin revelar la detección al solicitante.
 * - Persiste la solicitud y registra evento de auditoría.
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers) ?? "unknown";
  const userAgent = request.headers.get("user-agent");

  const limited = rateLimit(`inquiry:${ip}`, 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { message: "Demasiadas solicitudes. Intenta de nuevo en un momento." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ message: "Cuerpo de la solicitud no válido." }, { status: 400 });
  }

  const parsed = inquirySchema.safeParse(json);
  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return NextResponse.json(
      { message: "Datos incompletos o no válidos.", fieldErrors },
      { status: 422 },
    );
  }

  const data = parsed.data;

  // Honeypot: si viene relleno, respondemos como éxito sin persistir (spam bot).
  if (data.website) {
    return NextResponse.json({ message: "Solicitud recibida." }, { status: 201 });
  }

  const flags = screenText(`${data.summary} ${data.relationship ?? ""}`);
  const needsTriage = flags.length > 0;

  try {
    const inquiry = await prisma.inquiry.create({
      data: {
        name: data.name,
        organizationName: data.organizationName || null,
        email: data.email,
        phone: data.phone || null,
        serviceType: data.serviceType,
        country: data.country || null,
        region: data.region || null,
        summary: data.summary,
        urgency: data.urgency,
        relationship: data.relationship || null,
        authorizationConfirmed: data.authorizationConfirmed,
        contactConsent: data.contactConsent,
        status: needsTriage ? "IN_TRIAGE" : "RECEIVED",
        sourceIpHash: await sha256Hex(ip),
      },
      select: { id: true },
    });

    await recordAudit({
      action: "inquiry.received",
      resourceType: "inquiry",
      resourceId: inquiry.id,
      metadata: {
        serviceType: data.serviceType,
        needsTriage,
        complianceFlags: flags.map((f) => f.category),
      },
      ip,
      userAgent,
    });

    return NextResponse.json(
      {
        message:
          "Hemos recibido tu solicitud. Un miembro del equipo la evaluará de forma confidencial y definirá el canal seguro para continuar.",
        id: inquiry.id,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[inquiries] error al persistir:", err);
    return NextResponse.json(
      { message: "No fue posible registrar la solicitud en este momento. Intenta más tarde." },
      { status: 503 },
    );
  }
}
