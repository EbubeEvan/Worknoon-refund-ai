import { useQuery } from "@tanstack/react-query";

import { LayersIcon } from "@/components/icons.js";
import { Badge } from "@/components/ui/badge.js";
import { Card, CardBody, CardHeader } from "@/components/ui/card.js";
import { EmptyState } from "@/components/ui/empty-state.js";
import { SkeletonRows } from "@/components/ui/skeleton.js";
import { endpoints } from "@/lib/api.js";

/** The exact indexed chunks of one policy, i.e. what retrieval can search. */
export function PolicyChunks({ policyId }: Readonly<{ policyId: string | null }>) {
  const detail = useQuery({
    queryKey: ["policy", policyId],
    queryFn: () => endpoints.policy(policyId!),
    enabled: Boolean(policyId),
  });

  if (!policyId) {
    return (
      <Card>
        <EmptyState
          icon={<LayersIcon size="size-5" />}
          title="Select a policy"
          description="Choose a policy on the left to inspect the chunks that were indexed."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        icon={<LayersIcon size="size-[18px]" />}
        title="Indexed chunks"
        description="The exact sections the assistant can quote from."
        action={
          detail.data ? (
            <Badge tone="info" dot>
              {detail.data.chunkCount} chunks
            </Badge>
          ) : null
        }
      />
      {detail.isLoading ? (
        <CardBody>
          <SkeletonRows rows={4} />
        </CardBody>
      ) : (detail.data?.chunks.length ?? 0) === 0 ? (
        <EmptyState icon={<LayersIcon size="size-5" />} title="No chunks" />
      ) : (
        <ul className="max-h-[32rem] divide-y divide-border/70 overflow-y-auto">
          {detail.data?.chunks.map((c) => (
            <li key={c.id} className="px-6 py-4 transition-colors hover:bg-surface-muted/40">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-subtle">
                Chunk {c.chunkIndex}
              </p>
              <pre className="mt-2 font-sans text-[12px] leading-relaxed whitespace-pre-wrap text-muted">
                {c.content}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
