import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth.js";
import { Badge, Button } from "@/components/ui.js";

/**
 * App chrome: header, identity, role-appropriate nav, sign out.
 *
 * The nav is built from the session role for convenience; the server enforces
 * the same rule regardless of what is rendered here.
 */
export function AppShell({
  children,
  nav,
}: Readonly<{
  children: ReactNode;
  nav?: ReactNode;
}>) {
  const { user, isAdmin, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    void router.navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-xs font-bold text-white">
              W
            </span>
            <span className="text-sm text-foreground">Refund Desk</span>
          </Link>

          <nav className="ml-2 hidden items-center gap-1 sm:flex">{nav}</nav>

          <div className="ml-auto flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-medium text-foreground">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-subtle">{user.email}</p>
                </div>
                <Badge tone={isAdmin ? "info" : "neutral"}>
                  {isAdmin ? "Admin" : "Customer"}
                </Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleSignOut()}
                >
                  Sign out
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-[11px] text-subtle">
        Refund decisions are made by deterministic policy rules. The AI parses
        the request and explains the outcome; it never approves a refund.
      </footer>
    </div>
  );
}

export function NavLink({
  to,
  children,
  active,
}: Readonly<{
  to: string;
  children: ReactNode;
  active?: boolean;
}>) {
  return (
    <Link
      to={to}
      className={
        active
          ? "rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground"
          : "rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
      }
    >
      {children}
    </Link>
  );
}
