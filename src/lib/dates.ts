/**
 * Date helpers.
 *
 * Everything is computed in Zach's timezone, not the server's. Vercel runs in
 * UTC, so "today" has to be derived deliberately or the board flips over at
 * 7 PM Central.
 */

import {
  START,
  END,
  WEEK_ZERO,
  WEDDING,
  HOLIDAYS,
  WEEKS,
  CHECKPOINTS,
  type Week,
  type Checkpoint,
} from "./plan";

export const TZ = "America/Chicago";

/** YYYY-MM-DD for a given instant, in Zach's timezone. */
export function isoDate(d: Date = new Date(), timeZone: string = TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Minutes past local midnight for a given instant. */
export function minutesOfDay(d: Date = new Date(), timeZone: string = TZ): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return (h % 24) * 60 + m;
}

/** Parse YYYY-MM-DD as a timezone-free calendar date. */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Day of week for a YYYY-MM-DD string. Sun=0..Sat=6. */
export function dowOf(iso: string): number {
  return parseISO(iso).getUTCDay();
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}

export function isBetween(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end;
}

/** Monday of the week containing `iso`. */
export function weekStart(iso: string): string {
  const dow = dowOf(iso);
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(iso, -back);
}

/** Day number in the 90-day plan. Day 1 is Aug 24. */
export function dayNumber(iso: string): number {
  return daysBetween(START, iso) + 1;
}

export function weekOf(iso: string): Week | undefined {
  return WEEKS.find((w) => isBetween(iso, w.start, w.end));
}

export function formatLong(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseISO(iso));
}

export function formatShort(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(parseISO(iso));
}

export type DayMode =
  | "pre"        // before exit week
  | "week0"      // exit week at Cognition
  | "decompress" // between the last day and Day 1
  | "plan"       // a normal working day
  | "weekend"
  | "holiday"
  | "wedding"
  | "after";     // past Day 90

export type DayContext = {
  date: string;
  dow: number;
  mode: DayMode;
  dayNum: number;
  week?: Week;
  weekStart: string;
  holidayName?: string;
  /** Set when this date is a Day 30 / 60 / 90 board meeting. */
  checkpoint?: Checkpoint;
  /** Progress through the 90 days, 0..1. */
  progress: number;
};

export function dayContext(iso: string): DayContext {
  const dow = dowOf(iso);
  const dayNum = dayNumber(iso);
  const week = weekOf(iso);
  const holidayName = HOLIDAYS[iso];
  const checkpoint = CHECKPOINTS.find((c) => c.date === iso);

  let mode: DayMode = "plan";
  if (iso < WEEK_ZERO.start) mode = "pre";
  else if (isBetween(iso, WEEK_ZERO.start, WEEK_ZERO.end)) mode = "week0";
  else if (iso < START) mode = "decompress";
  else if (iso > END) mode = "after";
  // A board meeting outranks the weekend. Day 90 falls on a Saturday and it is
  // still the day the next chapter gets decided.
  else if (checkpoint) mode = "plan";
  else if (holidayName) mode = "holiday";
  else if (isBetween(iso, WEDDING.start, WEDDING.end)) mode = "wedding";
  else if (dow === 0 || dow === 6) mode = "weekend";

  return {
    date: iso,
    dow,
    mode,
    dayNum,
    week,
    weekStart: weekStart(iso),
    holidayName,
    checkpoint,
    progress: Math.max(0, Math.min(1, dayNum / 90)),
  };
}

export function phaseLabel(ctx: DayContext): string {
  switch (ctx.mode) {
    case "pre":
      return "Pre-launch";
    case "week0":
      return "Week 0 - Exit week";
    case "decompress":
      return "Decompression";
    case "holiday":
      return `${ctx.holidayName} - Off`;
    case "wedding":
      return "Wedding week";
    case "weekend":
      return "Weekend - Off";
    case "after":
      return "Post Day 90";
    default:
      return ctx.checkpoint
        ? `${ctx.checkpoint.label} board meeting`
        : `Day ${ctx.dayNum} of 90 - Week ${ctx.week?.n ?? "-"}`;
  }
}
