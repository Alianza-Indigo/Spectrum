import { SpectralBackground } from "@/components/spectral/spectral-background";
import { Logo } from "@/components/site/logo";

/**
 * Layout del portal público de entrega. Independiente del sitio y de la consola:
 * no expone navegación interna ni datos de sesión. Fondo oscuro espectral.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <SpectralBackground />
      <header className="flex h-20 items-center justify-center border-b border-border/40">
        <Logo href="/" />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  );
}
