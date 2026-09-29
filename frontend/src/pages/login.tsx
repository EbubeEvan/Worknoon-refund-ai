import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth.js";
import { ApiError } from "@/lib/api.js";
import { Alert, Button, Card, CardBody, Input, Label, Spinner } from "@/components/ui.js";

/** Demo accounts, offered as one-click fills so the reviewer can try both roles. */
const DEMO_ACCOUNTS = [
  { label: "Customer (approval case)", email: "ada@worknoon.test" },
  { label: "Customer (amount over limit)", email: "grace@worknoon.test" },
  { label: "Customer (final sale)", email: "marcus@worknoon.test" },
  { label: "Admin", email: "admin@worknoon.test" },
];
const DEMO_PASSWORD = "password123";

export function LoginPage() {
  const { signIn, user, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  // Already signed in: skip the form.
  if (user) {
    void router.navigate({ to: "/" });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      void router.navigate({ to: "/" });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not sign in. Check the API is running.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="mx-auto grid size-10 place-items-center rounded-xl bg-primary text-sm font-bold text-white">
            W
          </div>
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-foreground">Refund Desk</h1>
          <p className="mt-1 text-xs text-muted">Sign in to submit or review a refund request.</p>
        </div>

        <Card>
          <CardBody className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error ? <Alert tone="danger">{error}</Alert> : null}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Spinner className="size-3.5" /> : null}
                {submitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Demo accounts</p>
            <p className="text-[11px] text-muted">
              Password for all seeded accounts: <code className="font-mono">{DEMO_PASSWORD}</code>
            </p>
            <ul className="space-y-1 pt-1">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(DEMO_PASSWORD);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-surface-muted"
                  >
                    <span className="text-foreground">{a.label}</span>
                    <span className="font-mono text-subtle">{a.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <p className="text-center text-[11px] text-subtle">
          <Link to="/" className="hover:text-muted">
            Back
          </Link>
        </p>
      </div>
    </div>
  );
}
