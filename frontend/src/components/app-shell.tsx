import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { LogOutIcon, ShieldIcon } from "@/components/icons.js";
import { Avatar, Badge, Button } from "@/components/ui.js";
import { useAuth } from "@/lib/auth.js";

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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center gap-3">
            <Link to="/" className="group flex shrink-0 items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-primary to-accent text-sm font-bold text-white shadow-sm transition duration-200 group-hover:shadow-raised">
                W
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-[15px] font-semibold tracking-tight text-foreground">
                  Refund Desk
                </span>
                <span className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-subtle">
                  Worknoon
                </span>
              </span>
            </Link>

            <nav className="ml-4 hidden items-center rounded-full bg-surface-muted p-1 lg:flex">
              {nav}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              {user ? (
                <>
                  <div className="hidden items-center gap-2.5 rounded-full border border-border bg-surface py-1 pr-3.5 pl-1 shadow-xs sm:flex">
                    <Avatar name={user.name} size="sm" />
                    <span className="flex flex-col leading-none">
                      <span className="text-[13px] font-medium text-foreground">{user.name}</span>
                      <span className="mt-0.5 text-[10px] text-subtle">{user.email}</span>
                    </span>
                    <Badge tone={isAdmin ? "info" : "neutral"}>
                      {isAdmin ? "Admin" : "Customer"}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleSignOut()}
                    aria-label="Sign out"
                    className="text-muted"
                  >
                    <LogOutIcon size="size-4" />
                    <span className="hidden sm:inline">Sign out</span>
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {/* Nav drops below the header on narrow screens rather than vanishing. */}
          {nav ? (
            <nav className="-mx-1 flex items-center gap-1 overflow-x-auto pb-3 lg:hidden">
              {nav}
            </nav>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
        <div className="flex flex-col items-start gap-2.5 rounded-2xl border border-border/70 bg-surface/60 px-5 py-4 sm:flex-row sm:items-center sm:gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-approved-surface text-approved">
            <ShieldIcon size="size-4" />
          </span>
          <p className="text-[12px] leading-relaxed text-muted">
            <span className="font-semibold text-foreground">
              Every refund follows the same published policy.
            </span>{" "}
            Our assistant reads your request and explains the outcome &mdash; it never decides the
            refund itself.
          </p>
        </div>
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
          ? "rounded-full bg-surface px-3.5 py-1.5 text-[13px] font-medium text-foreground shadow-sm ring-1 ring-border/70 transition"
          : "rounded-full px-3.5 py-1.5 text-[13px] font-medium text-muted transition duration-150 hover:bg-surface hover:text-foreground"
      }
    >
      {children}
    </Link>
  );
}
