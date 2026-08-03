import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/lib/auth/session";
import { canAny, type Permission } from "@/lib/auth/rbac";

/** Devuelve la sesión actual (o null) leyendo la cookie httpOnly. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Exige sesión; redirige a /consola si no hay. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/consola");
  return session;
}

/** Exige sesión y un permiso; redirige a la consola si no lo tiene. */
export async function requirePermission(permission: Permission): Promise<SessionPayload> {
  const session = await requireSession();
  if (!canAny(session.roles, permission)) redirect("/consola/panel");
  return session;
}
