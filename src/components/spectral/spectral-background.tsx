/**
 * Fondo espectral discreto: nodos y auroras de luz en gradiente índigo/violeta/
 * cyan/magenta. Puramente decorativo (aria-hidden). Respeta prefers-reduced-motion
 * a través de la clase `.spx-animated` (ver globals.css) — sin estética de videojuego.
 */
export function SpectralBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Auroras */}
      <div className="spx-animated animate-spectral-drift absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-indigo/20 blur-[120px]" />
      <div
        className="spx-animated animate-spectral-drift absolute -right-32 top-24 h-[30rem] w-[30rem] rounded-full bg-violet/20 blur-[120px]"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="spx-animated animate-spectral-drift absolute bottom-[-12rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-cyan/15 blur-[130px]"
        style={{ animationDelay: "-12s" }}
      />
      {/* Retícula tenue de nodos */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="spx-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#spx-grid)" className="text-foreground" />
      </svg>
    </div>
  );
}
