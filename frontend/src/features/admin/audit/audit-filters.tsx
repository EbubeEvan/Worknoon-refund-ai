import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import { ACTIONS } from "@/features/admin/audit/audit-actions.js";
import { cn } from "@/lib/cn.js";

/** Free-text action filter, with the known actions as suggestions. */
export function AuditActionInput({
  action,
  onChange,
}: Readonly<{ action: string; onChange: (action: string) => void }>) {
  return (
    <div className="w-full sm:w-64">
      <Label htmlFor="action">Filter by action</Label>
      <Input
        id="action"
        value={action}
        onChange={(e) => onChange(e.target.value)}
        list="audit-actions"
        placeholder="All actions"
      />
      <datalist id="audit-actions">
        {ACTIONS.filter(Boolean).map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
    </div>
  );
}

/** One-tap chips for each known action; tapping the active one clears it. */
export function AuditQuickFilter({
  action,
  onChange,
}: Readonly<{ action: string; onChange: (action: string) => void }>) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-surface-muted/40 px-6 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-subtle">
        Quick filter
      </span>
      {ACTIONS.filter(Boolean).map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onChange(a === action ? "" : a)}
          aria-pressed={a === action}
          className={cn(
            "rounded-full px-2.5 py-1 font-mono text-[11px] transition duration-150",
            a === action
              ? "bg-primary text-white shadow-sm"
              : "bg-surface-muted text-muted ring-1 ring-border/80 ring-inset hover:text-foreground",
          )}
        >
          {a}
        </button>
      ))}
      {action ? (
        <Button variant="ghost" size="sm" onClick={() => onChange("")}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}
