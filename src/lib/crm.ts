/**
 * CRM vocabulary and the rules that decide what needs attention.
 *
 * The plan doc's calendar rules are the source of these: every conversation
 * ends with one explicit next step, follow up within 24 hours, and no
 * ambiguous warm lead older than seven days.
 */

export type Opportunity = {
  id: string;
  name: string;
  org: string;
  lane: string;
  tier: number | null;
  strength: number | null;
  energy: number | null;
  value: string;
  currency: string;
  status: string;
  next_step: string;
  next_step_on: string | null;
  last_contact_on: string | null;
  notes: string;
  updated_at?: string;
};

export const LANES = [
  { key: "roles", name: "Roles", desc: "Live processes and target companies" },
  { key: "advisory", name: "Advisory", desc: "Paid GTM work, pilots, proposals" },
  { key: "network", name: "Network", desc: "Connectors, founders, investors, operators" },
  { key: "substance", name: "Return to Substance", desc: "Operators and owners" },
  { key: "rabbi_ari", name: "Rabbi Ari", desc: "Pilot users" },
] as const;

export const STATUSES = [
  { key: "new", name: "New" },
  { key: "active", name: "Active" },
  { key: "proposal", name: "Proposal" },
  { key: "committed", name: "Committed" },
  { key: "parked", name: "Parked" },
  { key: "closed", name: "Closed" },
] as const;

/** Statuses that are still in play. Parked and closed stop nagging. */
export const LIVE_STATUSES = ["new", "active", "proposal", "committed"];

export const CURRENCY_OPTIONS = [
  { key: "", name: "-" },
  { key: "runway", name: "Runway" },
  { key: "proof", name: "Proof" },
  { key: "relationships", name: "Relationships" },
  { key: "reputation", name: "Reputation" },
];

export function laneName(key: string): string {
  return LANES.find((l) => l.key === key)?.name ?? key;
}

export function statusName(key: string): string {
  return STATUSES.find((s) => s.key === key)?.name ?? key;
}

export type Flag = "no_next_step" | "no_date" | "overdue" | "aging" | null;

/**
 * What is wrong with this record, if anything.
 *
 * Ordered by how much it matters: a live opportunity with no next step at all
 * is worse than one whose next step has slipped, which is worse than one that
 * has simply gone quiet.
 */
export function flagFor(o: Opportunity, today: string): Flag {
  if (!LIVE_STATUSES.includes(o.status)) return null;
  if (!o.next_step.trim()) return "no_next_step";
  if (!o.next_step_on) return "no_date";
  if (o.next_step_on < today) return "overdue";
  return null;
}

/** Days since last contact, or null if never recorded. */
export function daysQuiet(o: Opportunity, today: string): number | null {
  if (!o.last_contact_on) return null;
  const a = Date.parse(o.last_contact_on + "T00:00:00Z");
  const b = Date.parse(today + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}

export const FLAG_LABEL: Record<string, string> = {
  no_next_step: "no next step",
  no_date: "needs a date",
  overdue: "overdue",
  aging: "going quiet",
};

/**
 * The plan doc's rule, applied: a live opportunity that has not been touched in
 * seven days and has no future next step is an ambiguous warm lead.
 */
export const AGING_DAYS = 7;

export function needsAttention(list: Opportunity[], today: string) {
  const flagged = list
    .map((o) => ({ o, flag: flagFor(o, today), quiet: daysQuiet(o, today) }))
    .filter(
      (x) => x.flag !== null || (LIVE_STATUSES.includes(x.o.status) && (x.quiet ?? 0) >= AGING_DAYS)
    );
  return flagged;
}
