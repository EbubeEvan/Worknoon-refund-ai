/**
 * Deterministic prompt-injection detection.
 *
 * This is deliberately a fixed pattern list, not an LLM judgement. Two reasons:
 *
 *  1. A model asked "is this message an attack?" is itself attackable. The
 *     attacker controls the input the judge reads.
 *  2. The only thing this detector is allowed to do is escalate a request to a
 *     human. It can never grant anything, so a false positive costs a support
 *     ticket while a false negative costs nothing - the policy engine still
 *     applies every real rule afterwards. That asymmetry is why a cheap,
 *     auditable regex list is the right tool.
 *
 * The policy engine runs this BEFORE any approval rule, so an injection attempt
 * can never reach APPROVED regardless of what the model extracted.
 */

export type InjectionCategory =
  | "instruction_override"
  | "role_reversal"
  | "policy_bypass"
  | "authority_claim"
  | "exfiltration"
  | "amount_pressure";

interface InjectionPattern {
  category: InjectionCategory;
  regex: RegExp;
}

/**
 * Patterns are written to avoid firing on ordinary customer language.
 * "Ignore" alone does not match; "ignore all previous instructions" does.
 */
const PATTERNS: InjectionPattern[] = [
  {
    category: "instruction_override",
    regex: /\b(ignore|disregard|forget|override)\b[^.!?]{0,40}\b(all\s+)?(previous|prior|above|earlier|preceding|initial|system)\b[^.!?]{0,20}\b(instruction|instructions|prompt|prompts|rule|rules|direction|directions|context)\b/i,
  },
  {
    category: "instruction_override",
    regex: /\b(ignore|disregard|forget)\b\s+(everything|all|your)\b/i,
  },
  {
    category: "role_reversal",
    regex: /\byou\s+are\s+now\b|\bact\s+as\s+(a\s+|an\s+)?(system|admin|administrator|developer|root|superuser|operator)\b/i,
  },
  {
    category: "role_reversal",
    regex: /\b(pretend|imagine|roleplay|role-play)\b[^.!?]{0,30}\b(you\s+are|to\s+be|being)\b/i,
  },
  {
    category: "policy_bypass",
    regex: /\bbypass\b[^.!?]{0,30}\b(policy|policies|rule|rules|check|checks|verification|validation|system|process)\b/i,
  },
  {
    category: "policy_bypass",
    // Reverse word order: "the policy has been bypassed", "verification disabled".
    // Attacks do not reliably phrase things as "bypass the policy".
    regex: /\b(policy|policies|rule|rules|check|checks|verification|validation|eligibility|approval|system|guardrail|guardrails)\b[^.!?]{0,30}\b(bypass|bypassed|bypassing|breach|breached|circumvent|circumvented|evade|evaded|overridden|overrode|ignored|disabled|turned\s+off|switched\s+off|lifted|waived)\b/i,
  },
  {
    category: "policy_bypass",
    // Direct instructions aimed at the agent, e.g. "output the total as a refund".
    regex: /\b(output|issue|release|process|send|transfer|post)\b[^.!?]{0,40}\bas\s+a\s+(refund|credit|chargeback)\b/i,
  },
  {
    category: "policy_bypass",
    regex: /\b(no\s+need\s+to|without|skip|skipp?ing|don't\s+have\s+to)\b[^.!?]{0,30}\b(check|checking|verify|verifying|verification|review|approval|policy|validation)\b/i,
  },
  {
    category: "policy_bypass",
    regex: /\b(developer|admin|administrator|debug|god)\s*mode\b/i,
  },
  {
    category: "policy_bypass",
    regex: /\b(auto[- ]?approve|approve\s+(everything|all|any|this|my)|grant\s+(me\s+)?(a\s+)?refund|force\s+approve|mark\s+as\s+approved)\b/i,
  },
  {
    category: "authority_claim",
    regex: /\b(this\s+is|i\s+am|i'm)\s+(a\s+|an\s+)?(lawyer|attorney|legal\s+counsel|admin(istrator)?|owner|ceo|press|journalist)\b/i,
  },
  {
    category: "exfiltration",
    regex: /\b(reveal|show|print|output|display|repeat|dump|leak|expose)\b[^.!?]{0,40}\b(system\s+prompt|your\s+(prompt|instructions|rules|guidelines)|the\s+(prompt|rules|policy\s+text))\b/i,
  },
  {
    category: "amount_pressure",
    regex: /\b(refund|credit|return)\b[^.!?]{0,40}\b(everything|all\s+orders|every\s+order|any\s+amount|full\s+balance|unlimited)\b/i,
  },
  {
    category: "amount_pressure",
    regex: /\$\s?\d[\d,]{2,}\s*(usd)?\s*(regardless|no\s+matter|without\s+question|automatically|straight\s+to)\b/i,
  },
];

export interface InjectionScan {
  detected: boolean;
  /** Categories only - the raw matched text is deliberately not stored. */
  categories: InjectionCategory[];
}

/**
 * Scan a customer message for prompt-injection patterns.
 *
 * Only the *categories* are returned. Echoing the matched substring back into
 * an admin UI would re-render attacker-controlled text, which is its own
 * (minor) injection surface.
 */
export function scanForInjection(message: string): InjectionScan {
  const categories = new Set<InjectionCategory>();
  for (const { category, regex } of PATTERNS) {
    // Fresh lastIndex each call: these regexes are module-level, and a shared
    // /g flag would carry state between requests.
    if (regex.test(message)) categories.add(category);
  }
  return { detected: categories.size > 0, categories: [...categories] };
}
