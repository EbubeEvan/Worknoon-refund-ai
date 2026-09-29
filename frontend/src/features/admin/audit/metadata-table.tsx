import { ChevronDownIcon } from "@/components/icons.js";

/**
 * Renders audit metadata generically: scalar values as a key/value list, nested
 * arrays and objects as preformatted JSON. Keeps the table readable without
 * hard-coding every metadata shape the backend will ever emit.
 */
export function MetadataTable({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata ?? {});
  if (entries.length === 0) {
    return <span className="text-subtle">—</span>;
  }

  return (
    <dl className="space-y-0.5">
      {entries.map(([k, v]) => {
        const isComplex = typeof v === "object" && v !== null;
        const serialised =
          v === null || v === undefined ? "-" : isComplex ? JSON.stringify(v) : String(v);

        return (
          <div key={k} className="flex gap-1.5">
            <dt className="shrink-0 text-[12px] text-subtle">{k}:</dt>
            <dd className="min-w-0">
              {isComplex ? (
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-1 font-mono text-[10px] text-muted transition hover:text-foreground">
                    <ChevronDownIcon
                      size="size-3"
                      className="transition-transform duration-200 group-open:rotate-180"
                    />
                    {serialised}
                  </summary>
                  <pre className="mt-1 max-w-sm overflow-x-auto rounded-lg bg-surface-muted px-2.5 py-2 font-mono text-[10px] leading-relaxed text-muted">
                    {serialised}
                  </pre>
                </details>
              ) : (
                <span className="font-mono text-[10px] break-words text-muted">{serialised}</span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
