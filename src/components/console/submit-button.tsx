"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  size = "md",
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost" | "outline";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size={size} variant={variant} className={className} disabled={pending}>
      {pending ? "Guardando…" : children}
    </Button>
  );
}
