/**
 * Zach Inc. plan data.
 *
 * Ported verbatim from the 30-60-90 operating plan (zachinc306090final.md).
 * The plan doc is canon. If a number here disagrees with the doc, the doc wins.
 */

export const TIMEZONE = "America/Chicago";

/** Day 1. Monday, August 24 2026. */
export const START = "2026-08-24";
/** Day 90. Saturday, November 21 2026. */
export const END = "2026-11-21";

/** Exit week at Cognition. Before Day 1. */
export const WEEK_ZERO = { start: "2026-08-17", end: "2026-08-21" };

/** Wedding week. Maintenance only. The wedding itself is Saturday Oct 10. */
export const WEDDING = { start: "2026-10-05", end: "2026-10-11" };

/**
 * Days off. Weekends are handled separately.
 * Edit this list as holidays come up.
 */
export const HOLIDAYS: Record<string, string> = {
  "2026-09-07": "Labor Day",
  "2026-11-26": "Thanksgiving",
  "2026-11-27": "Day after Thanksgiving",
};

export type Week = {
  n: number;
  start: string;
  end: string;
  objective: string;
  proof: string;
};

export const WEEKS: Week[] = [
  {
    n: 1,
    start: "2026-08-24",
    end: "2026-08-30",
    objective:
      "Launch Zach Inc. Build the operating system, optionality scoreboard, career story, target-role taxonomy, and first paid bridge offer. Reopen the highest-trust relationships first.",
    proof:
      "CRM live; runway/proof/relationships/reputation scoreboard live; 8+ meetings booked; 10+ targeted messages sent; bridge offer v1 with a measurable commercial outcome; Roadrunner status clear.",
  },
  {
    n: 2,
    start: "2026-08-31",
    end: "2026-09-06",
    objective:
      "Turn conversations into market signal. Test the role taxonomy, make the first commercial asks, start operator research, and recruit Rabbi Ari users.",
    proof:
      "6-8 conversations completed; 2 operator interviews; at least 1 explicit paid pilot ask; target-role map refined by market feedback; 10-15 Rabbi Ari recruits; first public piece shipped.",
  },
  {
    n: 3,
    start: "2026-09-07",
    end: "2026-09-13",
    objective:
      "Convert signal into proof. Launch Rabbi Ari, ask people to pay for GTM help, and make sure every advisory opportunity has a business metric attached.",
    proof:
      "Rabbi Ari live; 2 additional operator interviews; 1-2 proposals or scoped pilot conversations with measurable commercial outcomes; second public piece; at least one new proof point or credible path to one.",
  },
  {
    n: 4,
    start: "2026-09-14",
    end: "2026-09-20",
    objective:
      "Create visible proof. Publish Return to Substance, distribute it personally, and push the best advisory and role leads toward decisions. Do not let the interesting experiments crowd out conversion.",
    proof:
      "Long-form or substantial essay shipped; 2 more operator interviews; paid pilot or proposal-stage lead; clear top role processes; optionality balance sheet shows progress in at least 3 of 4 currencies.",
  },
  {
    n: 5,
    start: "2026-09-21",
    end: "2026-09-27",
    objective:
      "Day 30 review and first narrowing. Decide what has actually increased optionality, then cut experiments that are not generating pull or proof.",
    proof:
      "Day 30 board memo; optionality balance sheet; at most 3 active bets; primary hypothesis for next month; best 10 relationships prioritized; next month calendar reallocated by evidence.",
  },
  {
    n: 6,
    start: "2026-09-28",
    end: "2026-10-04",
    objective:
      "Conversion sprint before wedding week. Move strongest role and revenue opportunities into concrete next steps.",
    proof:
      "Primary lane named provisionally; proposals and interviews scheduled beyond the wedding; no loose warm leads.",
  },
  {
    n: 7,
    start: "2026-10-05",
    end: "2026-10-11",
    objective: "Wedding week. Maintenance only. Protect the event and your attention.",
    proof: "Inbox triaged once daily; only urgent process moves handled; no new initiatives.",
  },
  {
    n: 8,
    start: "2026-10-12",
    end: "2026-10-18",
    objective: "Re-enter deliberately. Resume strongest lane, not all lanes.",
    proof: "Two strong days of reactivation; pipeline clean; one primary and one hedge operating again.",
  },
  {
    n: 9,
    start: "2026-10-19",
    end: "2026-10-25",
    objective: "Day 60 decision. Allocate 70% of work time to the primary lane.",
    proof: "Primary lane formally chosen; written reasons; low-signal bets parked; next 30-day close plan.",
  },
  {
    n: 10,
    start: "2026-10-26",
    end: "2026-11-01",
    objective: "Deep execution. Build or negotiate the thing that can actually change the economic picture.",
    proof: "Late-stage role movement, anchor client movement, or real ownership experiment with a counterparty.",
  },
  {
    n: 11,
    start: "2026-11-02",
    end: "2026-11-08",
    objective: "Close loops and create leverage. Ask directly for decisions, introductions, referrals, and terms.",
    proof: "At least one material yes/no obtained; no ambiguous warm leads older than seven days.",
  },
  {
    n: 12,
    start: "2026-11-09",
    end: "2026-11-15",
    objective:
      "Negotiate and de-risk. Focus on scope, economics, legal terms, delivery capacity, or co-founder fit depending on lane.",
    proof: "Written terms or quantified business case; risk list; negotiation plan.",
  },
  {
    n: 13,
    start: "2026-11-16",
    end: "2026-11-21",
    objective: "Day 90 board meeting. Commit, reset, or deliberately extend.",
    proof:
      "Signed offer, meaningful contracted revenue, or ownership commitment, plus one-page board memo for the next period.",
  },
];

/** What each weekday is for. Keys are JS getDay() values, Mon=1..Fri=5. */
export const DAY_FOCUS: Record<number, { name: string; what: string }> = {
  1: {
    name: "CEO + build",
    what:
      "Review signals, choose the week, write, create offers, research targets, and prepare high-value outreach. Keep the morning meeting-free.",
  },
  2: {
    name: "Market + revenue",
    what: "Heavy conversation day. Founders, connectors, prospects, role processes. Ask for next steps.",
  },
  3: {
    name: "Market + public proof",
    what: "Conversations plus the week's primary writing and publishing block.",
  },
  4: {
    name: "Conversion + exploration",
    what: "Proposals, second meetings, operator interviews, Return to Substance, Rabbi Ari user feedback.",
  },
  5: {
    name: "Ship + CEO review",
    what:
      "Follow-ups, decisions, pipeline hygiene, publish what is sitting in drafts, weekly memo, optionality balance sheet, and next week fully blocked before you stop.",
  },
};

/**
 * Weekly scoreboard. These are the plan doc's numbers.
 * `base` is the floor. Targets can be raised per-week from the Friday review,
 * which is the only place the ratchet is allowed to move.
 */
export type Quota = { key: string; name: string; label: string; base: number };

export const QUOTAS: Quota[] = [
  { key: "conversations", name: "Conversations", label: "6-8 high-quality external", base: 6 },
  { key: "outbound", name: "Outbound", label: "10 targeted messages or intro requests", base: 10 },
  { key: "artifacts", name: "Public artifact", label: "1 shipped", base: 1 },
  { key: "operator_interviews", name: "Operator interviews", label: "2 per week", base: 2 },
  { key: "rabbi_ari", name: "Rabbi Ari blocks", label: "2 per week", base: 2 },
  { key: "commercial_asks", name: "Commercial asks", label: "1 explicit ask", base: 1 },
];

/**
 * Ratchet rule. The board never raises a target on its own. After this many
 * consecutive weeks at or above target, the Friday review proposes a raise
 * and Zach decides.
 */
export const RATCHET_STREAK = 3;

/** The four currencies of optionality. */
export const CURRENCIES = [
  {
    key: "runway",
    name: "Runway",
    desc: "Paid work, signed revenue, or concrete economics that extend the window.",
  },
  {
    key: "proof",
    name: "Proof",
    desc: "Evidence you can point to: sourced, closed, influenced, shipped, measured.",
  },
  {
    key: "relationships",
    name: "Relationships",
    desc: "Important new people, stronger ties, and introductions that create surface area.",
  },
  {
    key: "reputation",
    name: "Reputation",
    desc: "Writing, inbound, referrals, and clearer association with valuable work.",
  },
] as const;

export type CurrencyKey = (typeof CURRENCIES)[number]["key"];

/** Daily floors. Non-negotiable minimums, from the plan doc's calendar rules. */
export const FLOORS_DAILY = [
  "Three outcomes written before opening the CRM",
  "Targeted outbound sent",
  "Every substantive conversation logged same day with a dated next step",
  "Every warm thread followed up within 24 hours",
  "CEO close done, tomorrow's outcomes drafted",
];

/** Friday adds to the daily floors. It does not replace them. */
export const FLOORS_FRIDAY = [
  "Weekly piece shipped or deliberately killed",
  "Weekly memo written and lanes scored",
  "Optionality balance sheet updated",
  "No warm lead enters the weekend without a dated next step",
  "Next week's top three outcomes and calendar locked",
];

export const WEEK_ZERO_ITEMS = [
  "Mon: Courtney call before broader comms. All-hands announcement. Clean and warm.",
  "Start the Yihan thread: full separation agreement and equity statement requested in writing",
  "Push for written answers on the third retention tranche and equity before Friday",
  "Separation agreement to the employment lawyer the day it arrives",
  "Handoff notes for Courtney; narrative aligned with Nicole and Carol for Matt",
  "Fri: personal files off the laptop; personal copies of every employment document secured",
  "Nothing signed before lawyer review is complete. The last day is not the signing deadline.",
];

export type Checkpoint = {
  day: number;
  date: string;
  label: string;
  decision: string;
  evidence: string[];
};

export const CHECKPOINTS: Checkpoint[] = [
  {
    day: 30,
    date: "2026-09-22",
    label: "Day 30",
    decision: "What is pulling?",
    evidence: [
      "25+ quality conversations",
      "1 paid pilot tied to a measurable commercial result, or 2 proposal-stage leads",
      "2 to 3 strong role processes",
      "4 public artifacts",
      "6 operator interviews",
      "10 to 15 person Rabbi Ari pilot completed or underway",
      "First optionality balance sheet complete",
    ],
  },
  {
    day: 60,
    date: "2026-10-22",
    label: "Day 60",
    decision: "What gets 70%?",
    evidence: [
      "Primary lane identified",
      "Concrete next-step pipeline",
      "Wedding completed without career chaos",
      "Low-signal experiments cut",
    ],
  },
  {
    day: 90,
    date: "2026-11-21",
    label: "Day 90",
    decision: "Commit or reset.",
    evidence: [
      "Signed offer, meaningful contracted revenue, or a specific ownership path with real counterparties and evidence",
      "One-page board memo for the next period",
    ],
  },
];

/** The three gates a full-time role must clear before it is even scored. */
export const BEAT_THE_FREEDOM_GATES = [
  {
    n: 1,
    name: "Wider aperture",
    test: "A wider and clearer charter than the one you left, with meaningful access to strategy and decisions.",
  },
  {
    n: 2,
    name: "Structural ownership",
    test: "A measurable business outcome you own, with decision rights and scope that do not depend on one sponsor's goodwill.",
  },
  {
    n: 3,
    name: "Risk-adjusted total opportunity",
    test: "Cash, equity, learning, network, and future leverage collectively justify giving up the runway. Not merely anxiety relief.",
  },
];

export const STANDING_RULE =
  "Do not confuse anxiety relief with evidence. A role must beat the freedom. A side experiment must earn its hours. The point of this window is to create enough options that the next move is chosen deliberately.";
