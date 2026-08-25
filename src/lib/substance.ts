/**
 * The substance filter.
 *
 * Section 8 of A Return to Substance defines substance as work that satisfies
 * at least one of three conditions. That definition is a screen, and this makes
 * it usable: point it at a business and it says whether the value survives
 * cheap coordination; point it at a role and it says whether the job is
 * substance or scaffolding.
 */

export type Assessment = {
  id: string;
  subject: string;
  kind: string;
  opportunity_id: string | null;
  tacit: boolean | null;
  tacit_note: string;
  durable: boolean | null;
  durable_note: string;
  presence: boolean | null;
  presence_note: string;
  scaffolding: string;
  verdict: string;
};

export const KINDS = [
  { key: "business", name: "Business" },
  { key: "role", name: "Role" },
  { key: "bet", name: "Own bet" },
  { key: "other", name: "Other" },
] as const;

export type Condition = {
  key: "tacit" | "durable" | "presence";
  name: string;
  test: string;
  /** The question to ask when the subject is a role rather than a business. */
  roleTest: string;
};

export const CONDITIONS: Condition[] = [
  {
    key: "tacit",
    name: "Tacit cognition",
    test:
      "Does the work embed knowledge that resists formalization and lives in practice? Could you write it down completely, or does it only exist in someone's hands?",
    roleTest:
      "Does doing this job well depend on judgment built from practice, or on following a process someone else defined?",
  },
  {
    key: "durable",
    name: "Durable results",
    test:
      "Does it produce something that outlasts the process and exists in a shared world, or does the output disappear into the next quarter?",
    roleTest:
      "At the end of a year, what exists that would not otherwise? A thing, or a record of activity?",
  },
  {
    key: "presence",
    name: "Presence is constitutive",
    test:
      "Does it require a specific person to mean what it means? Would an identical output from a machine be the same thing?",
    roleTest:
      "Does it matter that it is you? Or would the role produce the same value with anyone competent in the seat?",
  },
];

export function metCount(a: Assessment): number {
  return [a.tacit, a.durable, a.presence].filter((v) => v === true).length;
}

export function judgedCount(a: Assessment): number {
  return [a.tacit, a.durable, a.presence].filter((v) => v !== null).length;
}

export type Read = { label: string; detail: string; tone: "none" | "thin" | "solid" | "dense" };

/**
 * What the score means.
 *
 * The essay's claim is one condition is enough to qualify, so the read is
 * deliberately not a simple more-is-better score. Zero is the finding that
 * matters: it means the value on offer is coordination, and coordination is
 * what is getting cheap.
 */
export function readOf(a: Assessment): Read {
  const judged = judgedCount(a);
  const met = metCount(a);

  if (judged === 0) {
    return { label: "Not judged yet", detail: "Answer the three questions.", tone: "none" };
  }
  if (met === 0 && judged < 3) {
    return {
      label: "Nothing yet",
      detail: "No condition holds so far, and it is not fully judged.",
      tone: "none",
    };
  }
  if (met === 0) {
    return {
      label: "Scaffolding",
      detail:
        "The value on offer is coordination, and coordination is exactly what is getting cheap. Whatever else is true, do not mistake this for a durable asset.",
      tone: "none",
    };
  }
  if (met === 1) {
    return {
      label: "Substance, thin",
      detail:
        "One condition holds. It qualifies, but a single thread is a fragile thing to bet on. Worth watching.",
      tone: "thin",
    };
  }
  if (met === 2) {
    return {
      label: "Substance",
      detail: "Two conditions hold. The value here survives cheap coordination.",
      tone: "solid",
    };
  }
  return {
    label: "Dense substance",
    detail:
      "All three hold. Tacit, durable, and irreducibly personal. This is the shape the thesis predicts becomes more valuable, not less.",
    tone: "dense",
  };
}

/**
 * The ownership read: own the substance, automate the scaffolding.
 * Only meaningful once both halves are answered.
 */
export function ownershipRead(a: Assessment): string | null {
  const met = metCount(a);
  const hasScaffolding = a.scaffolding.trim().length > 0;
  if (met === 0 || !hasScaffolding) return null;
  return "Substance with a named compressible layer. This is the acquisition and operating case: own the part that cannot be automated, compress the part that can.";
}
