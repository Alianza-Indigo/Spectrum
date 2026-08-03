import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { signToken, verifyToken } from "@/lib/signing";

/**
 * Almacenamiento de objetos privado y autocontenido.
 *
 * Por defecto (`STORAGE_PROVIDER=db`, o sin configurar) los bytes se guardan
 * cifrables en la tabla `stored_objects` y SOLO se sirven mediante una URL
 * firmada y expirable a través de un route handler autenticado
 * (`/api/storage/[id]`). Nunca son públicos. Si se configura un bucket S3, el
 * adaptador puede extenderse para delegar en él conservando esta misma interfaz.
 */

export type StoreInput = {
  organizationId: string;
  contentType: string;
  bytes: Buffer;
  createdByUser?: string | null;
  keyHint?: string;
};

export function sha256Buffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export async function storeObject(input: StoreInput) {
  const sha256 = sha256Buffer(input.bytes);
  const key = `${input.organizationId}/${input.keyHint ?? "obj"}-${sha256.slice(0, 16)}`;

  const existing = await prisma.storedObject.findUnique({ where: { key } });
  if (existing) return existing;

  return prisma.storedObject.create({
    data: {
      organizationId: input.organizationId,
      key,
      provider: "db",
      contentType: input.contentType,
      sizeBytes: input.bytes.byteLength,
      sha256,
      data: Uint8Array.from(input.bytes),
      createdByUser: input.createdByUser ?? null,
    },
  });
}

export async function readObject(id: string) {
  return prisma.storedObject.findUnique({ where: { id } });
}

/** Genera una URL firmada y expirable para descargar un objeto. */
export async function signDownloadUrl(
  object: { id: string; organizationId: string },
  opts: { ttlSeconds?: number; filename?: string } = {},
): Promise<string> {
  const token = await signToken(
    { objectId: object.id, organizationId: object.organizationId, filename: opts.filename },
    opts.ttlSeconds ?? 600,
  );
  return `/api/storage/${object.id}?token=${encodeURIComponent(token)}`;
}

export async function verifyDownloadToken(objectId: string, token: string | null) {
  const payload = await verifyToken<{ objectId: string; organizationId: string; filename?: string }>(token);
  if (!payload || payload.objectId !== objectId) return null;
  return payload;
}
