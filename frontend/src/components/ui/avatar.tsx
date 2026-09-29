import { cn } from "@/lib/cn.js";

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
