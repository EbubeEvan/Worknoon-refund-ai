import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn.js";

/**
 * Small presentational primitives.
 *
 * Deliberately plain: this is a working system, not a design exercise. They
 * exist so pages share one visual language and so spacing/states are defined
 * once.
 */

export function Card({
  className,
  children,
}: Readonly<{
  className?: string;
  children: ReactNode;
}>) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: Readonly<{
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}>) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: Readonly<{
  className?: string;
  children: ReactNode;
}>) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

const BUTTON_VARIANTS = {
  primary: "bg-primary text-white hover:bg-primary-hover border-transparent",
  secondary: "bg-surface text-foreground hover:bg-surface-muted border-border",
  ghost:
    "bg-transparent text-muted hover:text-foreground hover:bg-surface-muted border-transparent",
  danger: "bg-denied text-white hover:opacity-90 border-transparent",
} as const;

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border font-medium",
        "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm",
        BUTTON_VARIANTS[variant],
        className,
      )}
    />
  );
}

export function Input({ className, ...props }: Readonly<InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground",
        "placeholder:text-subtle",
        "focus:border-primary focus:outline-2 focus:outline-primary/30",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    />
  );
}

export function Label({
  children,
  htmlFor,
}: Readonly<{
  children: ReactNode;
  htmlFor?: string;
}>) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-muted">
      {children}
    </label>
  );
}

export function Textarea(props: Readonly<React.TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground",
        "placeholder:text-subtle focus:border-primary focus:outline-2 focus:outline-primary/30",
        "disabled:cursor-not-allowed disabled:opacity-60",
        props.className,
      )}
    />
  );
}

type BadgeTone = "neutral" | "success" | "danger" | "warning" | "info";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-muted border-border",
  success: "bg-approved-surface text-approved border-approved/30",
  danger: "bg-denied-surface text-denied border-denied/30",
  warning: "bg-escalated-surface text-escalated border-escalated/30",
  info: "bg-info-surface text-info border-info/30",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: Readonly<{
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Maps a refund decision to its colour. */
export function decisionTone(decision: string): BadgeTone {
  switch (decision) {
    case "APPROVED":
      return "success";
    case "DENIED":
      return "danger";
    case "ESCALATED":
      return "warning";
    default:
      return "neutral";
  }
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: Readonly<{
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: BadgeTone;
}>) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-subtle">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-2xl font-semibold tabular-nums",
          tone === "success" && "text-approved",
          tone === "danger" && "text-denied",
          tone === "warning" && "text-escalated",
          !tone && "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-subtle">{hint}</p> : null}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: Readonly<{
  title: string;
  description?: string;
  action?: ReactNode;
}>) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-xs text-muted">{description}</p> : null}
      {action}
    </div>
  );
}

export function Spinner({ className }: Readonly<{ className?: string }>) {
  return (
    <span
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-border border-t-primary",
        className,
      )}
      aria-label="Loading"
    />
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: Readonly<{
  tone?: "info" | "success" | "danger" | "warning";
  title?: string;
  children: ReactNode;
}>) {
  const tones = {
    info: "border-info/30 bg-info-surface text-info",
    success: "border-approved/30 bg-approved-surface text-approved",
    danger: "border-denied/30 bg-denied-surface text-denied",
    warning: "border-escalated/30 bg-escalated-surface text-escalated",
  };
  return (
    <div className={cn("rounded-lg border px-3 py-2.5 text-xs", tones[tone])}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-0.5" : undefined}>{children}</div>
    </div>
  );
}
