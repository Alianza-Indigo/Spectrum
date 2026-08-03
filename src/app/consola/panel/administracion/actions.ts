"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role, RetentionAction } from "@prisma/client";
import { pageGuard } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { recordAudit } from "@/lib/audit";

const ADMIN_PATH = "/consola/panel/administracion";

const createUserSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  email: z.string().trim().toLowerCase().email("Correo electrónico no válido."),
  role: z.nativeEnum(Role),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export async function createUser(formData: FormData): Promise<void> {
  const session = await pageGuard("user:manage");

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos no válidos.";
    redirect(`${ADMIN_PATH}?error=${encodeURIComponent(message)}`);
  }

  const { name, email, role, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect(`${ADMIN_PATH}?error=${encodeURIComponent("Ya existe un usuario con ese correo.")}`);
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      organizationId: session.organizationId,
      passwordHash: hashPassword(password),
      isActive: true,
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: session.organizationId ?? "",
      userId: user.id,
      role,
    },
  });

  await recordAudit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: "user.create",
    resourceType: "user",
    resourceId: user.id,
    metadata: { role, email },
  });

  revalidatePath(ADMIN_PATH);
  redirect(`${ADMIN_PATH}?ok=user`);
}

const createRetentionSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  retainDays: z.coerce.number().int().positive("Los días de retención deben ser un entero positivo."),
  actionOnExpiry: z.nativeEnum(RetentionAction),
});

export async function createRetentionPolicy(formData: FormData): Promise<void> {
  const session = await pageGuard("retention:manage");

  const parsed = createRetentionSchema.safeParse({
    name: formData.get("name"),
    retainDays: formData.get("retainDays"),
    actionOnExpiry: formData.get("actionOnExpiry"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos no válidos.";
    redirect(`${ADMIN_PATH}?error=${encodeURIComponent(message)}`);
  }

  const { name, retainDays, actionOnExpiry } = parsed.data;

  const policy = await prisma.retentionPolicy.create({
    data: {
      organizationId: session.organizationId ?? "",
      name,
      retainDays,
      actionOnExpiry,
    },
  });

  await recordAudit({
    organizationId: session.organizationId,
    actorUserId: session.userId,
    action: "retention.create",
    resourceType: "retention_policy",
    resourceId: policy.id,
    metadata: { retainDays, actionOnExpiry },
  });

  revalidatePath(ADMIN_PATH);
  redirect(`${ADMIN_PATH}?ok=retention`);
}
