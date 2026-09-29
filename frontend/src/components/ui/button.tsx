import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn.js";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const BUTTON_VARIANTS = {
  primary:
    "bg-linear-to-b from-primary to-primary-hover text-primary-foreground shadow-sm ring-1 ring-black/5 hover:brightness-[1.07]",
  secondary:
    "bg-surface text-foreground ring-1 ring-border shadow-sm hover:bg-surface-muted hover:ring-border-strong",
  ghost: "bg-transparent text-muted hover:bg-surface-muted hover:text-foreground",
  danger:
    "bg-linear-to-b from-denied to-denied/90 text-white shadow-sm ring-1 ring-black/5 hover:brightness-[1.07]",
} as const;

const BUTTON_SIZES = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-[13px]",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-6 text-[15px]",
} as const;

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium",
        "transition duration-150 ease-out active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        BUTTON_SIZES[size],
        BUTTON_VARIANTS[variant],
        className,
      )}
    />
  );
}
