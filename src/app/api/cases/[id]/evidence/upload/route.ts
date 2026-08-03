import { NextResponse } from "next/server";
import { EvidenceType } from "@prisma/client";
import { authorize, created, badRequest } from "@/lib/api";
import { AccessError } from "@/lib/auth/guards";
import { ingestEvidence } from "@/lib/services/evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cases/:id/evidence/upload — incorpora un archivo de evidencia.
 * Recibe multipart/form-data con el campo `file` y metadatos opcionales.
 * El original nunca se reemplaza; se guarda y se calcula su hash SHA-256.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("evidence:upload");
  if ("error" in a) return a.error;
  const { session } = a;
  const { id } = await params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Se esperaba multipart/form-data.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return badRequest("Falta el archivo `file`.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const type = (form.get("type") as EvidenceType | null) ?? EvidenceType.DOCUMENT;

  try {
    const item = await ingestEvidence(session, id, {
      type,
      originalName: file.name,
      mimeType: file.type,
      bytes,
      description: form.get("description")?.toString(),
      sourceOrigin: form.get("sourceOrigin")?.toString(),
    });
    return created({ id: item.id, internalName: item.internalName, sha256: item.sha256 });
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
