import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { AppShell, NavLink } from "@/components/app-shell.js";
import { FileTextIcon, InboxIcon, LayersIcon, UploadIcon } from "@/components/icons.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Input,
  Label,
  PageHeader,
  SkeletonRows,
  Spinner,
  Textarea,
} from "@/components/ui.js";
import { endpoints, type Policy } from "@/lib/api.js";
import { cn } from "@/lib/cn.js";
import { friendlyError } from "@/lib/errors.js";
import { shortDate } from "@/lib/format.js";
import { FullPageSpinner, useAuthGuard } from "@/routes/root.js";

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
  const fileRef = useRef<HTMLInputElement>(null);

  const policies = useQuery({
    queryKey: ["policies"],
    queryFn: endpoints.policies,
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("1");
  const [inlineText, setInlineText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Policy | null>(null);

  const detail = useQuery({
    queryKey: ["policy", selected],
    queryFn: () => endpoints.policy(selected!),
    enabled: Boolean(selected),
  });

  const upload = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      const file = fileRef.current?.files?.[0];
      if (file) {
        form.append("file", file);
        form.append("version", version);
      } else {
        form.append("content", inlineText);
        form.append("name", name || "Pasted policy");
        form.append("originalFilename", "pasted.md");
        form.append("version", version);
      }
      return endpoints.uploadPolicy(form);
    },
    onSuccess: (res) => {
      setMessage(
        `Indexed "${res.policy.name}" into ${res.chunkCount} chunks` +
          (res.embedded ? " with embeddings." : " (embeddings skipped)."),
      );
      setError(null);
      setInlineText("");
      setName("");
      if (fileRef.current) fileRef.current.value = "";
      void queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
    onError: (err) => {
      setMessage(null);
      setError(friendlyError(err, "admin"));
    },
  });

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

  const nav = (
    <>
      <NavLink to="/admin">Dashboard</NavLink>
      <NavLink to="/admin/policies" active>
        Policies
      </NavLink>
      <NavLink to="/admin/audit">Audit</NavLink>
    </>
  );

  return (
    <AppShell nav={nav}>
      <div className="space-y-8">
        <PageHeader
          icon={<FileTextIcon size="size-5" />}
          title="Refund policy knowledge base"
          description="Upload a PDF, Markdown, or text policy. It is split into chunks and embedded with Gemini; retrieval searches the active policy only."
        />

        <Card>
          <CardHeader
            icon={<UploadIcon size="size-[18px]" />}
            title="Upload a policy"
            description="Up to 5 MB. We keep the searchable text so the assistant can quote it; the original file is discarded."
          />
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Policy name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Worknoon Standard Refund Policy"
                />
              </div>
              <div>
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  type="number"
                  min={1}
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                />
              </div>
            </div>

            {/* Dashed dropzone wrapped around the real file input, not a label
                standing in for it: the native control keeps its keyboard and
                file-picker behaviour while the container does the styling. */}
            <div>
              <Label htmlFor="file">Policy file</Label>
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border-strong bg-surface-muted/40 px-6 py-6 transition duration-200 hover:border-primary/50 hover:bg-primary-soft/35 sm:flex-row sm:text-left">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-primary shadow-xs">
                  <UploadIcon size="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground">
                    PDF, Markdown or plain text
                  </p>
                  <p className="mt-0.5 text-[11px] text-subtle">
                    Choose a file from your machine, up to 5 MB
                  </p>
                </div>
                <input
                  ref={fileRef}
                  id="file"
                  type="file"
                  accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain"
                  className="w-full shrink-0 text-xs text-muted file:mr-3 file:rounded-xl file:border-0 file:bg-primary file:px-3.5 file:py-2 file:text-xs file:font-medium file:text-white file:shadow-sm file:transition file:hover:brightness-110 sm:max-w-[15rem]"
                />
              </div>
            </div>

            <details className="group rounded-2xl border border-border/80 bg-surface-muted/40 px-4 py-3">
              <summary className="cursor-pointer list-none text-[13px] font-medium text-foreground">
                Or paste policy text instead
              </summary>
              <Textarea
                rows={6}
                className="mt-3"
                value={inlineText}
                onChange={(e) => setInlineText(e.target.value)}
                placeholder={"# Refund Policy\n\nRefunds are accepted within 30 days..."}
              />
            </details>

            {message ? <Alert tone="success">{message}</Alert> : null}
            {error ? <Alert tone="danger">{error}</Alert> : null}

            <Button
              size="lg"
              onClick={() => upload.mutate()}
              disabled={upload.isPending}
              className="w-full sm:w-auto"
            >
              {upload.isPending ? <Spinner className="size-4" /> : null}
              {upload.isPending ? "Indexing..." : "Upload and index"}
            </Button>
          </CardBody>
        </Card>

        <div className="grid items-start gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader
              icon={<FileTextIcon size="size-[18px]" />}
              title="Policies"
              description="Only the active policy is used when answering requests."
            />
            {policies.isLoading ? (
              <CardBody>
                <SkeletonRows rows={3} />
              </CardBody>
            ) : (policies.data?.policies.length ?? 0) === 0 ? (
              <EmptyState
                icon={<InboxIcon size="size-5" />}
                title="No policies yet"
                description="Upload one above to start answering refund requests."
              />
            ) : (
              <ul className="divide-y divide-border/70">
                {policies.data?.policies.map((p) => (
                  <li key={p.id}>
                    <PolicyRow
                      policy={p}
                      selected={selected === p.id}
                      onSelect={() => setSelected(p.id)}
                      onToggle={() =>
                        setStatus.mutate({
                          id: p.id,
                          status: p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                        })
                      }
                      onDelete={() => setPendingDelete(p)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="lg:col-span-3">
            {selected ? (
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
                      <li
                        key={c.id}
                        className="px-6 py-4 transition-colors hover:bg-surface-muted/40"
                      >
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
            ) : (
              <Card>
                <EmptyState
                  icon={<LayersIcon size="size-5" />}
                  title="Select a policy"
                  description="Choose a policy on the left to inspect the chunks that were indexed."
                />
              </Card>
            )}
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
