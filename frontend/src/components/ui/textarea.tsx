import type { Ref } from "react";

import { cn } from "@/lib/cn.js";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Forwarded so callers can focus the field or drive the caret. */
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textarea({ className, ...props }: Readonly<TextareaProps>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full resize-y rounded-xl border border-border bg-surface px-3.5 py-3 text-sm leading-relaxed text-foreground shadow-xs",
        "transition duration-150 placeholder:text-subtle/80",
        "hover:border-border-strong",
        "focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    />
  );
}
