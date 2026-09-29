import { ShieldIcon } from "@/components/icons.js";
import { Card, CardBody, CardHeader } from "@/components/ui/card.js";

const HOW_STEPS = [
  {
    title: "We read your message",
    body: "We pull out the order number, what went wrong, and any amount you mentioned.",
  },
  {
    title: "Our refund policy decides",
    body: "The policy is checked against your order — when you bought it, what's in it, and its history. That check produces the decision.",
  },
  {
    title: "We write you a reply",
    body: "Our assistant writes the reply afterwards, quoting the policy reason. It can't change the outcome.",
  },
];

export function HowItWorks() {
  return (
    <Card>
      <CardHeader
        icon={<ShieldIcon size="size-[18px]" />}
        title="How decisions are made"
        description="Here's what happens after you hit submit."
      />
      <CardBody>
        <ol className="space-y-4">
          {HOW_STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3.5">
              <span className="nums mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground">{s.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-xl border border-border/70 bg-surface-muted/60 px-3.5 py-3 text-[12px] leading-relaxed text-muted">
          Anything over $500, or anything unclear, goes to a real support agent instead of being
          decided automatically.
        </p>
      </CardBody>
    </Card>
  );
}
