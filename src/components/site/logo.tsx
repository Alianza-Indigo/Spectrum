import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { site } from "@/config/site";

/**
 * Marca oficial SPECTRUM (huella dactilar + wordmark). El arte original usa
 * texto oscuro, por lo que sobre superficies oscuras se coloca en un lockup
 * claro para preservar la legibilidad y el contraste accesible.
 */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center", className)} aria-label={site.fullName}>
      <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-black/5">
        <Image
          src="/spectrum-logo.png"
          alt={site.fullName}
          width={132}
          height={44}
          priority
          className="h-8 w-auto"
        />
      </span>
    </Link>
  );
}
