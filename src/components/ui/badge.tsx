import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "indigo" | "cyan" | "violet" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-raised text-muted border-border",
  indigo: "bg-indigo/10 text-indigo border-indigo/30",
  cyan: "bg-cyan/10 text-cyan border-cyan/30",
  violet: "bg-violet/10 text-violet border-violet/30",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: { tone?: Tone } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
