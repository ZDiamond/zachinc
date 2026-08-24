/**
 * The voice experiment.
 *
 * Nelson's advice was to write from genuine conviction. The open question is
 * which conviction survives a year, and that is not answerable by deciding. It
 * is answerable by shipping a few deliberately different pieces and watching
 * two signals.
 */

export type Conviction = {
  id: string;
  text: string;
  heat: number | null;
  created_at: string;
};

export type Angle = {
  id: string;
  name: string;
  description: string;
  headlines: string[];
  sort: number;
};

export type Piece = {
  id: string;
  title: string;
  angle_id: string | null;
  status: string;
  shipped_on: string | null;
  url: string;
  /** Did you want to write the next one immediately? Predicts lasting a year. */
  wanted_next: boolean | null;
  /** Did it create a conversation, an intro, or inbound? */
  created_pull: boolean | null;
  response_notes: string;
};

export const PIECE_STATUSES = [
  { key: "idea", name: "Idea" },
  { key: "drafting", name: "Drafting" },
  { key: "shipped", name: "Shipped" },
  { key: "killed", name: "Killed" },
] as const;

/**
 * An angle that cannot produce twenty headlines cannot produce two hundred and
 * fifty posts. This is the cheapest way to kill a candidate before it costs a
 * month.
 */
export const HEADLINE_TARGET = 20;

export const ARGUMENT_PROMPT =
  "Not what you know. What makes you want to interrupt. The ones with heat behind them are the ones that last.";

export type AngleScore = {
  angle: Angle;
  shipped: number;
  wantedNext: number;
  createdPull: number;
};

/** How each angle is doing on the two signals that matter. */
export function scoreAngles(angles: Angle[], pieces: Piece[]): AngleScore[] {
  return angles.map((angle) => {
    const mine = pieces.filter((p) => p.angle_id === angle.id && p.status === "shipped");
    return {
      angle,
      shipped: mine.length,
      wantedNext: mine.filter((p) => p.wanted_next === true).length,
      createdPull: mine.filter((p) => p.created_pull === true).length,
    };
  });
}

/**
 * What the experiment currently says, in one line.
 *
 * Deliberately refuses to name a winner on thin evidence: three pieces is the
 * minimum before the answer means anything, and an angle that has not been
 * tried has not lost.
 */
export function readout(scores: AngleScore[]): string {
  const totalShipped = scores.reduce((s, a) => s + a.shipped, 0);
  if (totalShipped === 0) {
    return "Nothing shipped yet. The experiment starts when the first piece goes out.";
  }
  if (totalShipped < 3) {
    return `${totalShipped} of 3 pieces shipped. Too early to read anything into it.`;
  }
  const best = [...scores]
    .filter((s) => s.shipped > 0)
    .sort((a, b) => b.wantedNext * 2 + b.createdPull - (a.wantedNext * 2 + a.createdPull))[0];
  if (!best || best.wantedNext === 0) {
    return "No angle has made you want to write the next one yet. That is the finding.";
  }
  const untried = scores.filter((s) => s.shipped === 0).map((s) => s.angle.name);
  const tail = untried.length ? ` Untried: ${untried.join(", ")}.` : "";
  return `"${best.angle.name}" is pulling: ${best.wantedNext} of ${best.shipped} made you want the next one.${tail}`;
}
