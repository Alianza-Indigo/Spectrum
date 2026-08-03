import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { site } from "@/config/site";

/**
 * Lockup oficial horizontal de SPECTRUM.
 */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center", className)} aria-label={site.fullName}>
      <span className="inline-flex items-center rounded-md bg-white px-2 py-1 shadow-sm ring-1 ring-amber-200/30">
        <Image
          src="/spectrum-wordmark.jpg"
          alt={site.fullName}
          width={330}
          height={94}
          priority
          className="h-10 w-auto object-contain"
        />
      </span>
    </Link>
  );
}
