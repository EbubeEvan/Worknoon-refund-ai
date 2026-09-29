import { Spinner } from "@/components/ui/spinner.js";

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-muted">
      <Spinner className="size-6" />
    </div>
  );
}
