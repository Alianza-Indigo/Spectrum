import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/site/logo";
import { SpectralBackground } from "@/components/spectral/spectral-background";
import { LoginForm } from "./login-form";
import { getSession } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "Acceso a la consola",
  robots: { index: false, follow: false },
};

export default async function ConsolaLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/consola/panel");
  const { next } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center px-5">
      <SpectralBackground />
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="spx-card p-8">
          <h1 className="text-xl font-semibold">Consola de inteligencia</h1>
          <p className="mt-1.5 text-sm text-muted">
            Acceso restringido a personal autorizado. Todos los accesos quedan registrados.
          </p>
          <div className="mt-7">
            <LoginForm next={next} />
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          ¿No eres personal de la agencia? Vuelve al{" "}
          <Link href="/" className="text-cyan hover:underline">sitio público</Link>.
        </p>
      </div>
    </div>
  );
}
