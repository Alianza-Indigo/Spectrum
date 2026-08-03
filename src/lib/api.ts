import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/current-user";
import { canAny, type Permission, type Role } from "@/lib/auth/rbac";
import type { SessionPayload } from "@/lib/auth/session";

/**
 * Utilidades para los route handlers de la API principal. Cada endpoint
 * requiere sesión y un permiso; los errores se devuelven en formato uniforme.
 */

export type ApiContext = { session: SessionPayload };

export async function authorize(
  permission?: Permission,
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ message: "No autenticado." }, { status: 401 }) };
  }
  if (permission && !canAny(session.roles as Role[], permission)) {
    return { error: NextResponse.json({ message: "No autorizado." }, { status: 403 }) };
  }
  return { session };
}

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created(data: unknown) {
  return NextResponse.json(data, { status: 201 });
}

export function badRequest(message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ message, ...extra }, { status: 400 });
}

export function unprocessable(fieldErrors: Record<string, string[] | undefined>) {
  return NextResponse.json({ message: "Datos no válidos.", fieldErrors }, { status: 422 });
}

export function notFoundJson() {
  return NextResponse.json({ message: "No encontrado." }, { status: 404 });
}

export function serverError() {
  return NextResponse.json({ message: "Error interno." }, { status: 500 });
}
