"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
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

  const { email, password, next } = parsed.data;

  let destination = "/consola/panel";
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: { where: { status: "ACTIVE" } } },
    });

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
