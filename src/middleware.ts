import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * Protege las rutas autenticadas de la consola. La verificación de sesión usa
 * Web Crypto (compatible con el runtime Edge del middleware). Los permisos
 * granulares por recurso se aplican además en cada página/handler.
 */
const PROTECTED_PREFIX = "/consola/panel";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(PROTECTED_PREFIX)) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = await verifySession(token);
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/consola";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/consola/:path*"],
};
