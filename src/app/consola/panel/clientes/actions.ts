"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ClientType, ClientRelationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { pageGuard, orgScope } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";

const clientSchema = z.object({
  type: z.nativeEnum(ClientType),
  displayName: z.string().trim().min(2).max(160),
  legalName: z.string().trim().max(200).optional(),
  taxId: z.string().trim().max(60).optional(),
  status: z.nativeEnum(ClientRelationStatus).default("PROSPECT"),
});

export async function createClient(formData: FormData) {
  const session = await pageGuard("client:write");
  const parsed = clientSchema.safeParse({
    type: formData.get("type"),
    displayName: formData.get("displayName"),
    legalName: formData.get("legalName") || undefined,
    taxId: formData.get("taxId") || undefined,
    status: formData.get("status") || "PROSPECT",
  });
  if (!parsed.success) redirect("/consola/panel/clientes/nuevo?error=1");

  const client = await prisma.client.create({
    data: { organizationId: session.organizationId!, ...parsed.data },
  });
  await recordAudit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: "client.create",
    resourceType: "client",
    resourceId: client.id,
  });
  redirect(`/consola/panel/clientes/${client.id}`);
}

const contactSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  role: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  isAuthorized: z.coerce.boolean().optional(),
});

export async function addContact(formData: FormData) {
  const session = await pageGuard("client:write");
  const parsed = contactSchema.safeParse({
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    role: formData.get("role") || undefined,
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    isAuthorized: formData.get("isAuthorized") === "on",
  });
  if (!parsed.success) return;

  // Verifica que el cliente pertenece a la organización (anti-IDOR).
  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, ...orgScope(session) },
  });
  if (!client) return;

  await prisma.clientContact.create({
    data: {
      clientId: client.id,
      name: parsed.data.name,
      role: parsed.data.role ?? null,
      email: parsed.data.email || null,
      phone: parsed.data.phone ?? null,
      isAuthorized: parsed.data.isAuthorized ?? false,
    },
  });
  await recordAudit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: "client.contact.add",
    resourceType: "client",
    resourceId: client.id,
  });
  revalidatePath(`/consola/panel/clientes/${client.id}`);
}
