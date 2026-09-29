import { FileTextIcon, InboxIcon } from "@/components/icons.js";
import { Badge } from "@/components/ui/badge.js";
import { Card, CardBody, CardHeader } from "@/components/ui/card.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { SkeletonRows } from "@/components/ui/skeleton.js";
import type { Policy } from "@/lib/api.js";
import { cn } from "@/lib/cn.js";
import { shortDate } from "@/lib/format.js";

/** Every uploaded policy, with activate/deactivate and delete controls. */
export function PolicyList({
  policies,
  isLoading,
  selected,
  onSelect,
  onToggle,
  onDelete,
}: Readonly<{
  policies: Policy[];
  isLoading: boolean;
  selected: string | null;
  onSelect: (id: string) => void;
  onToggle: (policy: Policy) => void;
  onDelete: (policy: Policy) => void;
}>) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader
        icon={<FileTextIcon size="size-[18px]" />}
        title="Policies"
        description="Only the active policy is used when answering requests."
      />
      {isLoading ? (
        <CardBody>
          <SkeletonRows rows={3} />
        </CardBody>
      ) : policies.length === 0 ? (
        <EmptyState
          icon={<InboxIcon size="size-5" />}
          title="No policies yet"
          description="Upload one above to start answering refund requests."
        />
      ) : (
        <ul className="divide-y divide-border/70">
          {policies.map((p) => (
            <li key={p.id}>
              <PolicyRow
                policy={p}
                selected={selected === p.id}
                onSelect={() => onSelect(p.id)}
                onToggle={() => onToggle(p)}
                onDelete={() => onDelete(p)}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PolicyRow({
  policy,
  selected,
  onSelect,
  onToggle,
  onDelete,
}: {
  policy: Policy;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex cursor-pointer items-start justify-between gap-3 px-6 py-4 transition duration-150",
        selected ? "bg-primary-soft/50" : "hover:bg-surface-muted/60",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-foreground">{policy.name}</p>
        <p className="mt-1 text-[11px] text-subtle">
          v{policy.version} · {policy.sourceType} · {shortDate(policy.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Badge tone={policy.status === "ACTIVE" ? "success" : "neutral"} dot>
          {policy.status}
        </Badge>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="rounded text-[11px] font-medium text-primary transition hover:text-primary-hover"
          >
            {policy.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded text-[11px] font-medium text-denied transition hover:brightness-110"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
