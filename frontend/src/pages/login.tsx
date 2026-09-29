import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { ArrowRightIcon, ShieldIcon, SparkIcon } from "@/components/icons.js";
import { Alert, Button, Card, CardBody, Input, Label, Spinner } from "@/components/ui.js";
import { useAuth } from "@/lib/auth.js";
import { friendlyError } from "@/lib/errors.js";

/** Demo accounts, offered as one-click fills so the reviewer can try both roles. */
const DEMO_ACCOUNTS = [
  {
    label: "Approval case",
    hint: "Clean window, in stock",
    email: "ada@worknoon.test",
    admin: false,
  },
  {
    label: "Over the limit",
    hint: "Escalates to an agent",
    email: "grace@worknoon.test",
    admin: false,
  },
  {
    label: "Final sale",
    hint: "Order cannot be refunded",
    email: "marcus@worknoon.test",
    admin: false,
  },
  {
    label: "Administrator",
    hint: "Dashboard, policies, audit",
    email: "admin@worknoon.test",
    admin: true,
  },
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
      <div className="flex min-h-screen items-center justify-center text-muted">
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
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-linear-to-br from-primary to-accent text-base font-bold text-white shadow-raised">
            W
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            Refund Desk
          </h1>
          <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-muted">
            Sign in to manage your refunds.
          </p>
        </div>

        <Card className="mt-8 shadow-pop">
          <CardBody className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@worknoon.test"
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

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? <Spinner className="size-4" /> : null}
                {submitting ? "Signing in..." : "Sign in"}
                {submitting ? null : <ArrowRightIcon size="size-4" />}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card className="mt-4">
          <CardBody className="space-y-3.5">
            <div className="flex items-center gap-2">
              <SparkIcon size="size-4" className="text-accent" />
              <p className="text-[13px] font-semibold text-foreground">Try a demo account</p>
            </div>
            <p className="text-[12px] leading-relaxed text-muted">
              Every seeded account uses the password{" "}
              <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                {DEMO_PASSWORD}
              </code>
              . Pick one to fill the form.
            </p>
            <ul className="space-y-1.5 pt-0.5">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(DEMO_PASSWORD);
                      setError(null);
                    }}
                    className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition duration-150 hover:border-border hover:bg-surface-muted focus-visible:border-primary"
                  >
                    <span
                      className={
                        a.admin
                          ? "size-2 shrink-0 rounded-full bg-info"
                          : "size-2 shrink-0 rounded-full bg-primary/50"
                      }
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground">
                        {a.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-subtle">
                        {a.hint}
                      </span>
                    </span>
                    <span className="hidden shrink-0 font-mono text-[11px] text-subtle sm:block">
                      {a.email}
                    </span>
                    <ArrowRightIcon
                      size="size-4"
                      className="shrink-0 text-subtle transition group-hover:translate-x-0.5 group-hover:text-muted"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-muted">
          <ShieldIcon size="size-4" className="text-approved" />
          <span className="leading-relaxed">
            Our refund policy decides. The assistant only explains.
          </span>
        </div>

        <p className="mt-3 text-center text-[11px] text-subtle">
          <Link to="/" className="transition hover:text-muted">
            Back to the app
          </Link>
        </p>
      </div>
    </div>
  );
}
