/**
 * Adaptive day engine.
 *
 * The plan doc has an ideal weekday frame, but Zach's real day is shaped by
 * whatever is on his Google Calendar. So instead of rendering a fixed schedule
 * and letting reality contradict it, this builds the day around the meetings
 * that actually exist.
 *
 * Rules that come from the plan doc and hold regardless of the calendar:
 *   - Deep work is the first compounding block of the day and wants a long
 *     contiguous gap. It is protected before anything else is placed.
 *   - Revenue and opportunity work gets first claim over exploration work.
 *   - Every day opens with the CEO open and ends with the CEO close.
 *   - The workout is an anchor, not a filler.
 *
 * There is no enforced hard stop. If the day runs long the board says so
 * plainly and moves on.
 */

import { defaultSessionFor, type Session } from "./workout";

export type Interval = { start: number; end: number };

export type PlacedBlock = {
  key: string;
  name: string;
  what: string;
  start: number;
  end: number;
  kind: "anchor" | "work" | "meeting" | "break";
  /** Set when the block had to be shortened to fit around meetings. */
  squeezed?: boolean;
  /** Meeting titles, when kind === "meeting". */
  events?: string[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: number; // minutes from midnight, local
  end: number;
  allDay?: boolean;
};

export type DayPlan = {
  blocks: PlacedBlock[];
  /** Work blocks that could not be placed at all. */
  dropped: { name: string; why: string }[];
  /** Minutes of genuinely free deep-work time the calendar left available. */
  deepWorkMinutes: number;
  meetingMinutes: number;
  /** When the last block ends. Informational, not a rule. */
  endsAt: number;
  notes: string[];
};

export const MIN = (h: number, m = 0) => h * 60 + m;

export function fmtTime(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Merge overlapping or touching intervals. */
export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = [...list].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end) {
      last.end = Math.max(last.end, iv.end);
    } else {
      out.push({ ...iv });
    }
  }
  return out;
}

/** Free space inside [from, to] once `busy` is removed. */
export function freeGaps(from: number, to: number, busy: Interval[]): Interval[] {
  const merged = mergeIntervals(busy.filter((b) => b.end > from && b.start < to));
  const gaps: Interval[] = [];
  let cursor = from;
  for (const b of merged) {
    if (b.start > cursor) gaps.push({ start: cursor, end: Math.min(b.start, to) });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < to) gaps.push({ start: cursor, end: to });
  return gaps.filter((g) => g.end > g.start);
}

type WorkSpec = {
  key: string;
  name: string;
  what: string;
  ideal: number;
  min: number;
  /** Soft window the block would like to live in. */
  prefer?: Interval;
};

/**
 * Work blocks in priority order. Earlier entries claim time first.
 * Order follows the plan doc: revenue and opportunity work outranks
 * exploration, and deep work outranks everything except the open.
 */
/**
 * Work blocks in priority order. Earlier entries claim time first, so when the
 * calendar is full the tail of this list is what gets dropped. That ordering is
 * the plan doc's: revenue and opportunity work outranks exploration, and on
 * Friday the weekly review outranks another build block.
 */
function workSpecs(dow: number): WorkSpec[] {
  const ceoOpen: WorkSpec = {
    key: "ceo_open",
    name: "CEO open",
    what: "Review the 90-day scorecard. Write today's three outcomes. Open the CRM only after the outcomes are written.",
    ideal: 20,
    min: 10,
    prefer: { start: MIN(8, 30), end: MIN(10, 0) },
  };

  const outbound: WorkSpec = {
    key: "outbound",
    name: "Outbound",
    what: "Today's targeted messages. Personal notes, one concrete ask each. No spray-and-pray.",
    ideal: 25,
    min: 15,
    prefer: { start: MIN(10, 30), end: MIN(13, 0) },
  };

  const revenue: WorkSpec = {
    key: "revenue",
    name: "Revenue",
    what: "Proposals, pricing, follow-ups, pilot scoping. One explicit ask that moves money closer.",
    ideal: 60,
    min: 30,
    prefer: { start: MIN(15, 0), end: MIN(17, 30) },
  };

  // Friday is the ship and review day. It is not a shorter day, it is a
  // different one: the week's piece goes out and the business gets reviewed.
  if (dow === 5) {
    return [
      ceoOpen,
      {
        key: "ship",
        name: "Ship",
        what: "Publish the week's piece. Send anything sitting in drafts. Close the commercial loops that should not age over the weekend.",
        ideal: 120,
        min: 60,
        prefer: { start: MIN(9, 0), end: MIN(12, 30) },
      },
      outbound,
      revenue,
      {
        key: "weekly_ceo",
        name: "Weekly CEO review",
        what: "Score the week against quotas. Update the optionality balance sheet. Write one honest paragraph on pull. Cut low-signal work. Lock next week before you stop.",
        ideal: 60,
        min: 45,
        prefer: { start: MIN(15, 0), end: MIN(18, 0) },
      },
      {
        key: "explore",
        name: "Career / explore",
        what: "Only if the week's quotas are met. Return to Substance, Rabbi Ari, operator work, role prep.",
        ideal: 60,
        min: 40,
        prefer: { start: MIN(13, 0), end: MIN(17, 0) },
      },
    ];
  }

  return [
    ceoOpen,
    {
      key: "deep_1",
      name: "Deep work I",
      what: "The hardest compounding work first. Writing, offer development, proposal work, or prep. Do not give this block to casual calls.",
      ideal: 120,
      min: 50,
      prefer: { start: MIN(9, 0), end: MIN(12, 30) },
    },
    outbound,
    revenue,
    {
      key: "deep_2",
      name: "Deep work II",
      what: "Second build block: writing, offers, prep.",
      ideal: 90,
      min: 45,
      prefer: { start: MIN(14, 30), end: MIN(17, 30) },
    },
    {
      key: "explore",
      name: "Career / explore",
      what: "High-conviction roles and interview prep, Return to Substance, Rabbi Ari, operator work. Paid work or a live role outranks polishing side experiments.",
      ideal: 75,
      min: 40,
      prefer: { start: MIN(14, 0), end: MIN(17, 30) },
    },
  ];
}

/** Score how well a placement inside `gap` satisfies a spec's preferred window. */
function scorePlacement(gap: Interval, spec: WorkSpec, duration: number): { start: number; score: number } | null {
  if (gap.end - gap.start < duration) return null;
  const prefer = spec.prefer;
  let start = gap.start;
  if (prefer) {
    // Nudge toward the preferred window without leaving the gap.
    start = Math.min(Math.max(gap.start, prefer.start), gap.end - duration);
  }
  const end = start + duration;
  let score = 0;
  if (prefer) {
    const overlap = Math.max(0, Math.min(end, prefer.end) - Math.max(start, prefer.start));
    score += (overlap / duration) * 100;
    score -= Math.abs(start - prefer.start) / 60; // mild pull toward the ideal start
  } else {
    score += 50;
  }
  return { start, score };
}

export type BuildDayInput = {
  dow: number;
  events: CalendarEvent[];
  session?: Session;
  /**
   * End of the working day. Work blocks are not scheduled past it. This is not
   * a rule Zach has to obey, it is the horizon the board plans against so that
   * a full calendar produces an honest "this did not fit" instead of silently
   * booking his evening.
   */
  softEnd?: number;
  wakeAt?: number;
};

export function buildDay(input: BuildDayInput): DayPlan {
  const { dow, events } = input;
  const session = input.session ?? defaultSessionFor(dow);
  const wake = input.wakeAt ?? MIN(6, 45);
  const softEnd = input.softEnd ?? MIN(18, 15);

  const notes: string[] = [];
  const blocks: PlacedBlock[] = [];
  const dropped: { name: string; why: string }[] = [];

  const timed = events.filter((e) => !e.allDay && e.end > e.start).sort((a, b) => a.start - b.start);
  const allDay = events.filter((e) => e.allDay);
  if (allDay.length) {
    notes.push(`All-day on the calendar: ${allDay.map((e) => e.title).join(", ")}.`);
  }

  // 1. Anchors. Morning routine and the workout come before the working day.
  const liftMinutes = session.kind === "lift" ? 60 : session.kind === "movement" ? 20 : 0;
  const morningEnd = wake + 45;
  blocks.push({
    key: "morning",
    name: "Morning",
    what: "Dogs, coffee, Rabbi Ari, journal. No email before the CEO open.",
    start: wake,
    end: morningEnd,
    kind: "anchor",
  });

  let workoutStart = morningEnd;
  let workoutEnd = workoutStart + liftMinutes;
  let workoutPlaced = liftMinutes > 0;

  // If a meeting collides with the default workout slot, move the workout
  // rather than dropping it. The workout is an anchor, not filler.
  if (liftMinutes > 0) {
    const collision = timed.find((e) => e.start < workoutEnd && e.end > workoutStart);
    if (collision) {
      const earlier = freeGaps(wake, collision.start, [{ start: wake, end: morningEnd }]).find(
        (g) => g.end - g.start >= liftMinutes
      );
      if (earlier) {
        workoutStart = earlier.start;
        workoutEnd = workoutStart + liftMinutes;
        notes.push(`Workout moved earlier to clear "${collision.title}".`);
      } else {
        const later = freeGaps(collision.end, MIN(21, 0), timed).find((g) => g.end - g.start >= liftMinutes);
        if (later) {
          workoutStart = later.start;
          workoutEnd = workoutStart + liftMinutes;
          notes.push(`Morning is booked. ${session.name} pushed to ${fmtTime(workoutStart)}.`);
        } else {
          workoutPlaced = false;
          notes.push(`No room for ${session.name} today. Log it whenever you get it in.`);
        }
      }
    }
  }

  if (workoutPlaced) {
    blocks.push({
      key: "workout",
      name: session.kind === "lift" ? "Lift" : "Movement",
      what: `${session.name}. ${session.minutes}.`,
      start: workoutStart,
      end: workoutEnd,
      kind: "anchor",
    });
  }

  // The working day starts once the morning is done. A workout pushed into the
  // afternoon does not delay the start of work.
  const workoutIsMorning = workoutPlaced && workoutStart < MIN(11, 0);
  const transitionEnd = workoutIsMorning ? workoutEnd + 30 : morningEnd;
  if (workoutIsMorning) {
    blocks.push({
      key: "transition",
      name: "Transition",
      what: "Shower, reset.",
      start: workoutEnd,
      end: transitionEnd,
      kind: "break",
    });
  }

  // 2. Lunch. A real break away from the desk, unless a meeting owns the slot.
  const lunchIdeal = { start: MIN(12, 0), end: MIN(12, 45) };
  const lunchClash = timed.some((e) => e.start < lunchIdeal.end && e.end > lunchIdeal.start);
  let lunch: Interval | null = lunchIdeal;
  if (lunchClash) {
    const alt = freeGaps(MIN(11, 30), MIN(14, 30), timed).find((g) => g.end - g.start >= 40);
    if (alt) {
      lunch = { start: alt.start, end: alt.start + 45 };
      notes.push(`Lunch moved to ${fmtTime(lunch.start)} around a meeting.`);
    } else {
      lunch = null;
      notes.push("No clean lunch gap today. Eat between calls, not at the desk.");
    }
  }
  if (lunch) {
    blocks.push({
      key: "lunch",
      name: "Lunch + walk",
      what: "Away from the desk. Long dog walk. No doom-scrolling job boards.",
      start: lunch.start,
      end: lunch.end,
      kind: "break",
    });
  }

  // 3. Meetings, as they actually are. A contiguous run reads as one market band.
  const meetingBands = mergeIntervals(timed.map((e) => ({ start: e.start, end: e.end })));
  for (const band of meetingBands) {
    const inBand = timed.filter((e) => e.start < band.end && e.end > band.start);
    blocks.push({
      key: `meet_${band.start}`,
      name: inBand.length > 1 ? "Market block" : "Meeting",
      what: inBand.map((e) => e.title).join(" / "),
      start: band.start,
      end: band.end,
      kind: "meeting",
      events: inBand.map((e) => e.title),
    });
  }

  // 4. Work blocks into whatever is left, up to the end of the working day.
  const busy: Interval[] = [
    { start: 0, end: transitionEnd },
    ...meetingBands,
    ...(lunch ? [lunch] : []),
    ...(workoutPlaced && !workoutIsMorning ? [{ start: workoutStart, end: workoutEnd }] : []),
  ];

  // Reserve the tail of the day for the CEO close so it is never squeezed out.
  const workHorizon = softEnd - 30;
  const gaps = freeGaps(transitionEnd, workHorizon, busy);
  const specs = workSpecs(dow);

  for (const spec of specs) {
    let placed = false;
    for (const target of [spec.ideal, spec.min]) {
      let best: { gapIdx: number; start: number; score: number } | null = null;
      gaps.forEach((gap, i) => {
        const p = scorePlacement(gap, spec, target);
        if (p && (!best || p.score > best.score)) best = { gapIdx: i, start: p.start, score: p.score };
      });
      if (best) {
        const chosen: { gapIdx: number; start: number; score: number } = best;
        const gap = gaps[chosen.gapIdx];
        const start = chosen.start;
        const end = start + target;
        blocks.push({
          key: spec.key,
          name: spec.name,
          what: spec.what,
          start,
          end,
          kind: "work",
          squeezed: target < spec.ideal,
        });
        const remainder: Interval[] = [];
        if (start - gap.start >= 15) remainder.push({ start: gap.start, end: start });
        if (gap.end - end >= 15) remainder.push({ start: end, end: gap.end });
        gaps.splice(chosen.gapIdx, 1, ...remainder);
        placed = true;
        break;
      }
    }
    if (!placed) {
      dropped.push({ name: spec.name, why: "No gap long enough before the end of the day." });
    }
  }

  // 5. Whatever is still unclaimed is slack. Naming it is useful: it is where a
  // new meeting can go without costing anything already planned.
  for (const gap of gaps) {
    if (gap.end - gap.start >= 25) {
      blocks.push({
        key: `open_${gap.start}`,
        name: "Open",
        what: "Unclaimed. Book a conversation here, or take the time back.",
        start: gap.start,
        end: gap.end,
        kind: "break",
      });
    }
  }

  // 6. CEO close goes last, in the first free half hour at or after the end of
  // the working day. It never lands on top of a meeting.
  const occupied = blocks.map((b) => ({ start: b.start, end: b.end }));
  const closeEarliest = Math.max(softEnd - 30, transitionEnd);
  const closeSlot = freeGaps(closeEarliest, MIN(23, 0), occupied).find((g) => g.end - g.start >= 30);
  const closeStart = closeSlot ? closeSlot.start : closeEarliest;
  if (closeStart > softEnd - 30) {
    notes.push(`CEO close pushed to ${fmtTime(closeStart)} by the calendar.`);
  }
  blocks.push({
    key: "ceo_close",
    name: "CEO close",
    what: "What shipped? What did you learn? What opportunity did you create? Tomorrow's three outcomes. Log optionality and commercial proof.",
    start: closeStart,
    end: closeStart + 30,
    kind: "work",
  });

  blocks.sort((a, b) => a.start - b.start || a.end - b.end);

  const meetingMinutes = meetingBands.reduce((s, b) => s + (b.end - b.start), 0);
  const deepWorkMinutes = blocks
    .filter((b) => b.kind === "work" && (b.key.startsWith("deep") || b.key === "ship"))
    .reduce((s, b) => s + (b.end - b.start), 0);
  const endsAt = blocks.reduce((m, b) => Math.max(m, b.end), 0);

  // Facts, stated plainly. No scolding, no encouragement.
  if (meetingMinutes >= 240) {
    notes.push(
      `${(meetingMinutes / 60).toFixed(1)} hours of meetings today. Deep work got ${deepWorkMinutes} minutes.`
    );
  }
  if (dropped.length) {
    notes.push(
      `Did not fit before ${fmtTime(softEnd)}: ${dropped.map((d) => d.name).join(", ")}. Move it, drop it, or work later. Your call.`
    );
  }

  return { blocks, dropped, deepWorkMinutes, meetingMinutes, endsAt, notes };
}
