import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "@/components/app-shell.js";
import { FullPageSpinner } from "@/components/full-page-spinner.js";
import { FileTextIcon } from "@/components/icons.js";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { AdminNav } from "@/features/admin/admin-nav.js";
import { PolicyChunks } from "@/features/admin/policies/policy-chunks.js";
import { PolicyList } from "@/features/admin/policies/policy-list.js";
import { PolicyUploadForm } from "@/features/admin/policies/policy-upload-form.js";
import { useAuthGuard } from "@/features/auth/use-auth-guard.js";
import { endpoints, type Policy } from "@/lib/api.js";

/**
 * Policy management: upload a document, watch it get chunked and embedded,
 * activate it, and inspect the exact chunks that retrieval will search.
 *
 * Showing the chunks matters: RAG is easy to claim and hard to verify. Being
 * able to read the indexed segments is what makes the knowledge base auditable.
 */
export function AdminPoliciesPage() {
  const { isReady } = useAuthGuard({ requireAdmin: true });
  const queryClient = useQueryClient();

  const policies = useQuery({
    queryKey: ["policies"],
    queryFn: endpoints.policies,
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Policy | null>(null);

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      endpoints.setPolicyStatus(v.id, v.status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["policies"] });
      if (selected) void queryClient.invalidateQueries({ queryKey: ["policy", selected] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => endpoints.deletePolicy(id),
    onSuccess: () => {
      setSelected(null);
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
  });

  if (!isReady) return <FullPageSpinner />;

  return (
    <AppShell nav={<AdminNav active="policies" />}>
      <div className="space-y-8">
        <PageHeader
          icon={<FileTextIcon size="size-5" />}
          title="Refund policy knowledge base"
          description="Upload a PDF, Markdown, or text policy. It is split into chunks and embedded with Gemini; retrieval searches the active policy only."
        />

        <PolicyUploadForm />

        <div className="grid items-start gap-6 lg:grid-cols-5">
          <PolicyList
            policies={policies.data?.policies ?? []}
            isLoading={policies.isLoading}
            selected={selected}
            onSelect={setSelected}
            onToggle={(p) =>
              setStatus.mutate({ id: p.id, status: p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })
            }
            onDelete={setPendingDelete}
          />

          <div className="lg:col-span-3">
            <PolicyChunks policyId={selected} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this policy?"
        description="This permanently removes the policy and everything indexed from it. The assistant will stop quoting it immediately."
        preview={
          pendingDelete ? (
            <>
              <span className="font-medium text-foreground">{pendingDelete.name}</span>
              <br />
              <span>
                Version {pendingDelete.version} · {pendingDelete.sourceType}
              </span>
            </>
          ) : null
        }
        confirmLabel="Delete policy"
        tone="danger"
        pending={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id);
        }}
      />
    </AppShell>
  );
}
