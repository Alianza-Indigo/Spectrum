import { NextResponse } from "next/server";
import { readObject, verifyDownloadToken } from "@/lib/adapters/storage";
import { recordAudit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/storage/:id?token=...
 * Descarga un objeto de almacenamiento privado. Requiere una URL firmada y
 * vigente. Registra el acceso en auditoría. Los objetos nunca son públicos.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  const payload = await verifyDownloadToken(id, token);
  if (!payload) {
    return NextResponse.json({ message: "Enlace no válido o expirado." }, { status: 403 });
  }

  const object = await readObject(id);
  if (!object || !object.data || object.organizationId !== payload.organizationId) {
    return NextResponse.json({ message: "No encontrado." }, { status: 404 });
  }

  await recordAudit({
    organizationId: object.organizationId,
    action: "storage.download",
    resourceType: "stored_object",
    resourceId: object.id,
    ip: clientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  const filename = payload.filename ?? object.key.split("/").pop() ?? "descarga";
  return new NextResponse(Buffer.from(object.data), {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      "Content-Length": String(object.sizeBytes),
      "Cache-Control": "private, no-store",
    },
  });
}
