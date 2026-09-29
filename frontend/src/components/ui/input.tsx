import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn.js";

export function Input({ className, ...props }: Readonly<InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-xs",
        "transition duration-150 placeholder:text-subtle/80",
        "hover:border-border-strong",
        "focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    />
  );
}
