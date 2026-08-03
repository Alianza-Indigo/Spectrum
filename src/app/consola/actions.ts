"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Role as PrismaRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/rbac";
import { recordAudit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export type LoginState = { error?: string };

export async function authenticate(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });
  if (!parsed.success) return { error: "Credenciales no válidas." };

  const { password, next } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  let destination = "/consola/panel";
  try {
    let user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: { where: { status: "ACTIVE" } } },
    });

    // Bootstrap de emergencia para el primer administrador en Vercel. Permite
    // iniciar el sistema aunque el build no haya podido ejecutar el seed.
    const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const configuredAdminPassword = process.env.ADMIN_PASSWORD;
    if (configuredAdminEmail === email && configuredAdminPassword === password) {
      const organization = await prisma.organization.upsert({
        where: { slug: "spectrum-demo" },
        update: {},
        create: {
          name: "SPECTRUM Agencia de Inteligencia",
          slug: "spectrum-demo",
          legalName: "SPECTRUM Agencia de Inteligencia",
          timezone: "America/Mexico_City",
        },
      });
      const adminPasswordHash = hashPassword(password);
      const admin = await prisma.user.upsert({
        where: { email },
        update: { passwordHash: adminPasswordHash, isActive: true, organizationId: organization.id },
        create: { email, name: "Administración", organizationId: organization.id, isActive: true, passwordHash: adminPasswordHash },
      });
      await prisma.organizationMember.upsert({
        where: { organizationId_userId_role: { organizationId: organization.id, userId: admin.id, role: PrismaRole.ADMIN } },
        update: { status: "ACTIVE" },
        create: { organizationId: organization.id, userId: admin.id, role: PrismaRole.ADMIN, status: "ACTIVE" },
      });
      user = await prisma.user.findUnique({
        where: { id: admin.id },
        include: { memberships: { where: { status: "ACTIVE" } } },
      });
    }

    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      // Mensaje genérico para no revelar si el correo existe.
      return { error: "Correo o contraseña incorrectos." };
    }

    const roles = user.memberships.map((m) => m.role as Role);
    const token = await signSession({
      userId: user.id,
      organizationId: user.organizationId,
      name: user.name,
      email: user.email,
      roles,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
    });

    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await recordAudit({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "auth.login",
      resourceType: "user",
      resourceId: user.id,
    });

    if (next && next.startsWith("/consola")) destination = next;
  } catch (err) {
    console.error("[auth] error de autenticación:", err);
    return { error: "Servicio de autenticación no disponible. Verifica la configuración de la base de datos." };
  }

  redirect(destination);
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/consola");
}
