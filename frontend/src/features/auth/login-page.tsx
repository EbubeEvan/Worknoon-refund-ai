import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { ArrowRightIcon, ShieldIcon } from "@/components/icons.js";
import { Alert } from "@/components/ui/alert.js";
import { Button } from "@/components/ui/button.js";
import { Card, CardBody } from "@/components/ui/card.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import { Spinner } from "@/components/ui/spinner.js";
import { DemoAccounts } from "@/features/auth/demo-accounts.js";
import { useAuth } from "@/lib/auth.js";
import { friendlyError } from "@/lib/errors.js";

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

        <DemoAccounts
          onPick={(pickedEmail, pickedPassword) => {
            setEmail(pickedEmail);
            setPassword(pickedPassword);
            setError(null);
          }}
        />

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
