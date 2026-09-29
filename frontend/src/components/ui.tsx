import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, Ref } from "react";

import { AlertIcon, CheckCircleIcon, InfoIcon, XCircleIcon, XIcon } from "@/components/icons.js";
import { cn } from "@/lib/cn.js";

/**
 * Presentational primitives.
 *
 * One visual language, defined once: spacing scale, elevation, radii, status
 * colours and interaction states all live here rather than being re-decided in
 * every page. Adding a colour means adding a token to `styles.css`, never
 * hard-coding a hex value in a component.
 */

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

export function Card({
  className,
  interactive = false,
  children,
}: Readonly<{
  className?: string;
  /** Lifts on hover. Only for cards that are actually clickable. */
  interactive?: boolean;
  children: ReactNode;
}>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-surface shadow-card",
        interactive &&
          "transition duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-raised",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  icon,
}: Readonly<{
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
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
  return <div className={cn("px-6 py-5", className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: Readonly<{
  className?: string;
  children: ReactNode;
}>) {
  return (
    <div className={cn("border-t border-border/70 bg-surface-muted/50 px-6 py-3.5", className)}>
      {children}
    </div>
  );
}

/**
 * Page title block. Every route used to repeat the same `h1` + `p` pair at four
 * different sizes; this is the single version of it.
 */
export function PageHeader({
  title,
  description,
  icon,
  action,
}: Readonly<{
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}>) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3.5">
        {icon ? (
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-primary to-accent text-white shadow-sm">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                    */
/* -------------------------------------------------------------------------- */

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

export function Label({
  children,
  htmlFor,
}: Readonly<{
  children: ReactNode;
  htmlFor?: string;
}>) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[13px] font-medium text-foreground">
      {children}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Status                                                                      */
/* -------------------------------------------------------------------------- */

type BadgeTone = "neutral" | "success" | "danger" | "warning" | "info";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-muted ring-1 ring-border/80 ring-inset",
  success: "bg-approved-surface text-approved ring-1 ring-approved/25 ring-inset",
  danger: "bg-denied-surface text-denied ring-1 ring-denied/25 ring-inset",
  warning: "bg-escalated-surface text-escalated ring-1 ring-escalated/25 ring-inset",
  info: "bg-info-surface text-info ring-1 ring-info/25 ring-inset",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  dot = false,
}: Readonly<{
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  /** A leading status dot. Reads faster in a dense list than colour alone. */
  dot?: boolean;
}>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide",
        BADGE_TONES[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
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
  icon,
}: Readonly<{
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: BadgeTone;
  icon?: ReactNode;
}>) {
  const toneStyles: Partial<Record<BadgeTone, string>> = {
    success: "text-approved bg-approved-surface",
    danger: "text-denied bg-denied-surface",
    warning: "text-escalated bg-escalated-surface",
    info: "text-info bg-info-surface",
  };

  return (
    <Card className="group px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">{label}</p>
        {icon ? (
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg transition duration-200",
              tone && toneStyles[tone] ? toneStyles[tone] : "bg-surface-muted text-subtle",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "nums mt-2 text-[26px] font-semibold leading-none tracking-tight",
          tone === "success" && "text-approved",
          tone === "danger" && "text-denied",
          tone === "warning" && "text-escalated",
          !tone && "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-[11px] leading-snug text-subtle">{hint}</p> : null}
    </Card>
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
    info: {
      box: "border-info/25 bg-info-surface",
      icon: "text-info",
      Glyph: InfoIcon,
    },
    success: {
      box: "border-approved/25 bg-approved-surface",
      icon: "text-approved",
      Glyph: CheckCircleIcon,
    },
    danger: {
      box: "border-denied/25 bg-denied-surface",
      icon: "text-denied",
      Glyph: XCircleIcon,
    },
    warning: {
      box: "border-escalated/30 bg-escalated-surface",
      icon: "text-escalated",
      Glyph: AlertIcon,
    },
  } as const;

  const { box, icon, Glyph } = tones[tone];

  return (
    <div className={cn("flex gap-3 rounded-xl border px-4 py-3.5", box)}>
      <Glyph size="size-[18px]" className={cn("mt-px shrink-0", icon)} />
      <div className="min-w-0 text-[13px] leading-relaxed">
        {title ? <p className={cn("font-semibold", icon)}>{title}</p> : null}
        <div
          className={cn(title ? "mt-1" : undefined, tone === "info" ? "text-foreground/80" : icon)}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Feedback                                                                    */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  title,
  description,
  action,
  icon,
}: Readonly<{
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}>) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon ? (
        <span className="grid size-11 place-items-center rounded-2xl bg-surface-muted text-subtle">
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function Spinner({ className }: Readonly<{ className?: string }>) {
  return (
    <span
      className={cn(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current/25 border-t-current",
        className,
      )}
      aria-label="Loading"
    />
  );
}

/**
 * Loading placeholder.
 *
 * A spinner tells the user something is happening; a skeleton tells them what is
 * about to arrive, and stops the layout jumping when data lands. Used wherever
 * a list or table loads, in preference to a centred spinner.
 */
export function Skeleton({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-lg bg-[length:220%_100%] bg-linear-to-r from-surface-muted via-surface-sunken to-surface-muted",
        className,
      )}
    />
  );
}

export function SkeletonRows({
  rows = 4,
  className,
}: Readonly<{ rows?: number; className?: string }>) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Identity + tables                                                           */
/* -------------------------------------------------------------------------- */

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  initials,
  size = "md",
  className,
}: Readonly<{
  name: string;
  /** Overrides the derived initials. Needed for names like "Worknoon Support". */
  initials?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}>) {
  const sizes = {
    sm: "size-7 text-[10px]",
    md: "size-9 text-[11px]",
    lg: "size-11 text-[13px]",
  } as const;

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold tracking-wide text-white",
        "bg-linear-to-br from-primary to-accent shadow-sm ring-2 ring-white/70",
        sizes[size],
        className,
      )}
      aria-hidden="true"
      title={name}
    >
      {initials ?? initialsOf(name)}
    </span>
  );
}

/**
 * Table primitives.
 *
 * The scroll container lives here so every data table gets the same horizontal
 * overflow behaviour on a narrow screen, and rows get the same hover state.
 */
export function Table({
  className,
  children,
}: Readonly<{ className?: string; children: ReactNode }>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left text-[13px]">{children}</table>
    </div>
  );
}

export function THead({ children }: Readonly<{ children: ReactNode }>) {
  return <thead className="bg-surface-muted/60">{children}</thead>;
}

export function Th({
  className,
  children,
}: Readonly<{ className?: string; children?: ReactNode }>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-subtle",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: Readonly<{ children: ReactNode }>) {
  return <tbody className="divide-y divide-border/70">{children}</tbody>;
}

export function Tr({
  className,
  children,
}: Readonly<{
  className?: string;
  children: ReactNode;
}>) {
  return (
    <tr className={cn("transition-colors hover:bg-surface-muted/50", className)}>{children}</tr>
  );
}

export function Td({
  className,
  children,
}: Readonly<{ className?: string; children?: ReactNode }>) {
  return <td className={cn("px-5 py-3 align-middle text-foreground", className)}>{children}</td>;
}

/* -------------------------------------------------------------------------- */
/* Dialogs                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Modal dialog, built on Radix.
 *
 * Radix owns the hard parts — focus trap, ESC to close, click-outside to
 * close, aria labelling, portal — while the visuals stay in this file's warm
 * language. Never use `confirm()` or `alert()`: they block the tab, ignore the
 * theme, and are invisible to screen readers.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}>) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-border/80 bg-surface shadow-pop",
            "animate-dialog-in focus:outline-none",
            wide ? "max-w-lg" : "max-w-md",
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-[16px] font-semibold tracking-tight text-foreground">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-[13px] leading-relaxed text-muted">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Close dialog"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              <XIcon size="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="px-6 py-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Confirmation for destructive or consequential actions: policy deletion,
 * escalation approve/deny. The preview slot shows what is about to happen
 * (amount, order, agent note) so the click is informed, not habitual.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  preview,
  confirmLabel,
  tone = "danger",
  pending = false,
  onConfirm,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  preview?: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  pending?: boolean;
  onConfirm: () => void;
}>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      {preview ? (
        <div className="mb-4 rounded-xl border border-border/70 bg-surface-muted/50 px-4 py-3 text-[13px] leading-relaxed text-muted">
          {preview}
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <DialogPrimitive.Close asChild>
          <Button variant="secondary" disabled={pending}>
            Cancel
          </Button>
        </DialogPrimitive.Close>
        <Button
          variant={tone === "danger" ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? <Spinner className="size-3.5" /> : null}
          {pending ? "Working..." : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Pagination                                                                  */
/* -------------------------------------------------------------------------- */

export const PAGE_SIZE = 10;

/**
 * Prev/next pager for server- or client-paginated lists.
 *
 * Renders nothing for a single page so short lists don't gain chrome they
 * don't need. Page state lives in the caller (URL or useState); this is
 * presentation plus bounds.
 */
export function Pagination({
  page,
  total,
  pageSize = PAGE_SIZE,
  onPage,
  className,
}: Readonly<{
  /** 1-based current page. */
  page: number;
  /** Total item count across all pages. */
  total: number;
  pageSize?: number;
  onPage: (page: number) => void;
  className?: string;
}>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-surface-muted/40 px-6 py-3.5",
        className,
      )}
    >
      <p className="nums text-[12px] text-muted" aria-live="polite">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
