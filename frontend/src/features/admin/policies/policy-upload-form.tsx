import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { UploadIcon } from "@/components/icons.js";
import { Alert } from "@/components/ui/alert.js";
import { Button } from "@/components/ui/button.js";
import { Card, CardBody, CardHeader } from "@/components/ui/card.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import { Spinner } from "@/components/ui/spinner.js";
import { Textarea } from "@/components/ui/textarea.js";
import { endpoints } from "@/lib/api.js";
import { friendlyError } from "@/lib/errors.js";

/**
 * Upload a policy file or paste its text; the backend chunks and embeds it.
 */
export function PolicyUploadForm() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [version, setVersion] = useState("1");
  const [inlineText, setInlineText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
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
              <p className="text-[13px] font-medium text-foreground">PDF, Markdown or plain text</p>
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
  );
}
