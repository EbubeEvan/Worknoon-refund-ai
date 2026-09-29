import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { AppShell, NavLink } from "@/components/app-shell.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Label,
  Spinner,
  Textarea,
} from "@/components/ui.js";
import { ApiError, endpoints, type Policy } from "@/lib/api.js";
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
      setError(err instanceof ApiError ? err.message : "Upload failed");
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
      void queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
  });

  if (!isReady) return <FullPageSpinner />;

  const nav = (
    <>
      <NavLink to="/customer">My account</NavLink>
      <NavLink to="/admin">Dashboard</NavLink>
      <NavLink to="/admin/policies" active>
        Policies
      </NavLink>
      <NavLink to="/admin/audit">Audit</NavLink>
    </>
  );

  return (
    <AppShell nav={nav}>
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Refund policy knowledge base
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            Upload a PDF, Markdown, or text policy. It is split into chunks and embedded with
            Gemini; retrieval searches the active policy only.
          </p>
        </div>

        <Card>
          <CardHeader
            title="Upload a policy"
            description="Maximum 5 MB. Extracted text is stored; the original file is not."
          />
          <CardBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
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

            <div>
              <Label htmlFor="file">Policy file</Label>
              <input
                ref={fileRef}
                id="file"
                type="file"
                accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain"
                className="w-full text-xs text-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
              />
            </div>

            <details className="rounded-lg border border-border px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-foreground">
                Or paste policy text instead
              </summary>
              <Textarea
                rows={6}
                className="mt-2"
                value={inlineText}
                onChange={(e) => setInlineText(e.target.value)}
                placeholder={"# Refund Policy\n\nRefunds are accepted within 30 days..."}
              />
            </details>

            {message ? <Alert tone="success">{message}</Alert> : null}
            {error ? <Alert tone="danger">{error}</Alert> : null}

            <Button onClick={() => upload.mutate()} disabled={upload.isPending}>
              {upload.isPending ? <Spinner className="size-3.5" /> : null}
              {upload.isPending ? "Indexing..." : "Upload and index"}
            </Button>
          </CardBody>
        </Card>

        <div className="grid gap-5 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader title="Policies" />
            {policies.isLoading ? (
              <CardBody>
                <Spinner />
              </CardBody>
            ) : (policies.data?.policies.length ?? 0) === 0 ? (
              <EmptyState title="No policies yet" />
            ) : (
              <ul className="divide-y divide-border">
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
                      onDelete={() => remove.mutate(p.id)}
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
                  title="Indexed chunks"
                  description="These are the exact segments retrieval searches."
                  action={
                    detail.data ? <Badge tone="info">{detail.data.chunkCount} chunks</Badge> : null
                  }
                />
                {detail.isLoading ? (
                  <CardBody>
                    <Spinner />
                  </CardBody>
                ) : (detail.data?.chunks.length ?? 0) === 0 ? (
                  <EmptyState title="No chunks" />
                ) : (
                  <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto">
                    {detail.data?.chunks.map((c) => (
                      <li key={c.id} className="px-5 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
                          Chunk {c.chunkIndex}
                        </p>
                        <pre className="mt-1 whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-muted">
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
                  title="Select a policy"
                  description="Choose a policy on the left to inspect its chunks."
                />
              </Card>
            )}
          </div>
        </div>
      </div>
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
      className={
        selected
          ? "flex cursor-pointer items-start justify-between gap-2 bg-surface-muted px-5 py-3"
          : "flex cursor-pointer items-start justify-between gap-2 px-5 py-3 hover:bg-surface-muted"
      }
      onClick={onSelect}
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-foreground">{policy.name}</p>
        <p className="mt-0.5 text-[11px] text-subtle">
          v{policy.version} &middot; {policy.sourceType} &middot; {shortDate(policy.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Badge tone={policy.status === "ACTIVE" ? "success" : "neutral"}>{policy.status}</Badge>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-primary hover:underline"
        >
          {policy.status === "ACTIVE" ? "Deactivate" : "Activate"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${policy.name}" and its chunks?`)) onDelete();
          }}
          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-denied hover:underline"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
