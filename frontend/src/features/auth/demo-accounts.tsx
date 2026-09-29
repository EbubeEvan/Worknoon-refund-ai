import { ArrowRightIcon, SparkIcon } from "@/components/icons.js";
import { Card, CardBody } from "@/components/ui/card.js";

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
    hint: "Dashboard, audit",
    email: "admin@worknoon.test",
    admin: true,
  },
];
export const DEMO_PASSWORD = "password123";

/** One-click fills for the seeded accounts, so both roles are easy to try. */
export function DemoAccounts({
  onPick,
}: Readonly<{ onPick: (email: string, password: string) => void }>) {
  return (
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
                onClick={() => onPick(a.email, DEMO_PASSWORD)}
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
                  <span className="mt-0.5 block truncate text-[11px] text-subtle">{a.hint}</span>
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
  );
}
