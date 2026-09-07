import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  ...props
}: ComponentProps<"span"> & {
  tone?: "muted" | "accent" | "var" | "coef" | "const";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide uppercase",
        tone === "muted" && "bg-surface-2 text-ink-soft",
        tone === "accent" && "bg-accent-soft text-accent",
        tone === "var" && "bg-accent-soft text-var",
        tone === "coef" && "bg-bad-soft text-coef",
        tone === "const" && "bg-ok-soft text-const",
        className,
      )}
      {...props}
    />
  );
}
