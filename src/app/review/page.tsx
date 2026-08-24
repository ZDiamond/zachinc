import { requireUser } from "@/lib/auth";
import { isoDate, addDays, formatShort, dayNumber, weekStart } from "@/lib/dates";
import {
  CHECKPOINTS,
  QUOTAS,
  CURRENCIES,
  CURRENCY_REVIEW,
  LANES,
  RATCHET_STREAK,
  START,
  type Checkpoint,
} from "@/lib/plan";
import Header from "@/components/Header";
import ReviewNotes from "@/components/ReviewNotes";

export const dynamic = "force-dynamic";

type DayRow = {
  date: string;
  ceo_close: Record<string, string> | null;
  commercial_proof: string | null;
  outcomes: string[] | null;
  outcomes_done: boolean[] | null;
};

type WeekRow = {
  week_start: string;
  week_n: number | null;
  counts: Record<string, number> | null;
  targets: Record<string, number> | null;
  currencies: Record<string, number> | null;
  review: string | null;
};

/**
 * The review view.
 *
 * The Day 30 / 60 / 90 memo is the point of the whole exercise, and writing it
 * from memory is exactly how the story beats the evidence. So this page
 * assembles the inputs from what was actually logged: quota attainment week by
 * week, the four currencies over time, every commercial proof entry, and every
 * CEO close. The memo itself still gets written by hand.
 */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: { cp?: string };
}) {
  const { user, supabase } = await requireUser();
  const today = isoDate();

  // Which checkpoint are we reviewing? Default to the next one still ahead,
  // or the last one if the 90 days are done.
  const requested = searchParams.cp ? Number(searchParams.cp) : null;
  const checkpoint: Checkpoint =
    CHECKPOINTS.find((c) => c.day === requested) ??
    CHECKPOINTS.find((c) => c.date >= today) ??
    CHECKPOINTS[CHECKPOINTS.length - 1];

  const idx = CHECKPOINTS.indexOf(checkpoint);
  const periodStart = idx === 0 ? START : addDays(CHECKPOINTS[idx - 1].date, 1);
  const periodEnd = checkpoint.date;

  const [daysRes, weeksRes, reviewRes] = await Promise.all([
    supabase
      .from("days")
      .select("date, ceo_close, commercial_proof, outcomes, outcomes_done")
      .eq("user_id", user.id)
      .gte("date", periodStart)
      .lte("date", periodEnd)
      .order("date", { ascending: true }),
    supabase
      .from("weeks")
      .select("week_start, week_n, counts, targets, currencies, review")
      .eq("user_id", user.id)
      .gte("week_start", weekStart(periodStart))
      .lte("week_start", periodEnd)
      .order("week_start", { ascending: true }),
    supabase
      .from("reviews")
      .select("lanes, memo")
      .eq("user_id", user.id)
      .eq("checkpoint_day", checkpoint.day)
      .maybeSingle(),
  ]);

  const days = (daysRes.data ?? []) as DayRow[];
  const weeks = (weeksRes.data ?? []) as WeekRow[];

  // Quota totals and per-week attainment.
  const totals: Record<string, number> = {};
  for (const q of QUOTAS) totals[q.key] = 0;
  for (const w of weeks) {
    for (const q of QUOTAS) totals[q.key] += w.counts?.[q.key] ?? 0;
  }

  // A quota is a candidate for a raise when it has been met for a streak of
  // consecutive weeks. The board proposes; it never raises anything itself.
  const raiseCandidates = QUOTAS.filter((q) => {
    let streak = 0;
    for (const w of [...weeks].reverse()) {
      const goal = w.targets?.[q.key] ?? q.base;
      if ((w.counts?.[q.key] ?? 0) >= goal) streak++;
      else break;
    }
    return streak >= RATCHET_STREAK;
  });

  const currencyTotals: Record<string, number> = {};
  for (const c of CURRENCIES) {
    currencyTotals[c.key] = weeks.reduce((s, w) => s + (w.currencies?.[c.key] ?? 0), 0);
  }

  const proofEntries = days.filter((d) => (d.commercial_proof ?? "").trim());
  const closeEntries = days.filter((d) =>
    ["ship", "learn", "opportunity"].some((k) => (d.ceo_close?.[k] ?? "").trim())
  );

  const outcomesHit = days.reduce(
    (s, d) => s + (d.outcomes_done ?? []).filter(Boolean).length,
    0
  );
  const outcomesSet = days.reduce(
    (s, d) => s + (d.outcomes ?? []).filter((o) => (o ?? "").trim()).length,
    0
  );

  const empty = days.length === 0 && weeks.length === 0;

  return (
    <>
      <Header
        dateLabel={`${formatShort(periodStart)} - ${formatShort(periodEnd)}`}
        phase={`${checkpoint.label} review`}
        active="review"
      />

      <section>
        <div className="sec-h">
          <h2>{checkpoint.label} board meeting</h2>
          <span className="sec-note">{checkpoint.decision}</span>
        </div>
        <nav className="navlinks" style={{ marginBottom: 16 }}>
          {CHECKPOINTS.map((c) => (
            <a key={c.day} href={`/review?cp=${c.day}`} aria-current={c === checkpoint ? "page" : undefined}>
              {c.label}
            </a>
          ))}
        </nav>
        <p className="objective">
          Everything below is what you actually logged between {formatShort(periodStart)} and{" "}
          {formatShort(periodEnd)}. Score the evidence, not the story you want to be true.
        </p>
        {empty ? (
          <div className="notes">
            <p>
              Nothing logged in this period yet. The review fills itself in as the daily board gets
              used.
            </p>
          </div>
        ) : null}
      </section>

      <section>
        <div className="sec-h">
          <h2>Required evidence</h2>
          <span className="sec-note">pass or fail</span>
        </div>
        <div className="cps">
          <div className="cp next" style={{ gridColumn: "1 / -1" }}>
            <ul>
              {checkpoint.evidence.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <div className="sec-h">
          <h2>Quota attainment</h2>
          <span className="sec-note">
            {weeks.length} week{weeks.length === 1 ? "" : "s"} logged
          </span>
        </div>
        <div className="score">
          {QUOTAS.map((q) => {
            const weeksMet = weeks.filter(
              (w) => (w.counts?.[q.key] ?? 0) >= (w.targets?.[q.key] ?? q.base)
            ).length;
            return (
              <div className={`tile ${weeks.length && weeksMet === weeks.length ? "met" : ""}`} key={q.key}>
                <div className="t-name">{q.name}</div>
                <div className="t-target">{q.label}</div>
                <div className="counter">
                  <span className="val">{totals[q.key]}</span>
                  <span className="goal">
                    total - met in {weeksMet}/{weeks.length || 0} weeks
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {raiseCandidates.length > 0 ? (
          <div className="notes">
            <p>
              At or above target for {RATCHET_STREAK}+ straight weeks:{" "}
              {raiseCandidates.map((q) => q.name).join(", ")}. Raise the target, or leave it and put
              the time somewhere else. Your call, not the board&apos;s.
            </p>
          </div>
        ) : null}
      </section>

      <section>
        <div className="sec-h">
          <h2>Optionality balance sheet</h2>
          <span className="sec-note">the whole period</span>
        </div>
        <div className="optionality">
          {CURRENCIES.map((c) => (
            <div className="opt" key={c.key}>
              <div className="o-name">{c.name}</div>
              <div className="o-desc">{CURRENCY_REVIEW[c.key]}</div>
              <div className="counter">
                <span className="val">{currencyTotals[c.key]}</span>
                <span className="goal">logged</span>
              </div>
            </div>
          ))}
        </div>
        {weeks.length > 0 ? (
          <div className="notes">
            <p>
              By week:{" "}
              {weeks
                .map(
                  (w) =>
                    `wk${w.week_n ?? "?"} ${CURRENCIES.map(
                      (c) => `${c.name[0]}${w.currencies?.[c.key] ?? 0}`
                    ).join(" ")}`
                )
                .join("   |   ")}
            </p>
          </div>
        ) : null}
      </section>

      <section>
        <div className="sec-h">
          <h2>Commercial proof</h2>
          <span className="sec-note">
            {proofEntries.length} entr{proofEntries.length === 1 ? "y" : "ies"}
          </span>
        </div>
        {proofEntries.length === 0 ? (
          <p className="objective" style={{ color: "var(--muted)" }}>
            No commercial proof logged in this period. That is itself the finding.
          </p>
        ) : (
          <div className="blocks">
            {proofEntries.map((d) => (
              <div className="blk" key={d.date}>
                <time>{formatShort(d.date)}</time>
                <span className="b-what">{d.commercial_proof}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="sec-h">
          <h2>What shipped, learned, created</h2>
          <span className="sec-note">
            {outcomesHit}/{outcomesSet} outcomes hit - {closeEntries.length} closes logged
          </span>
        </div>
        {closeEntries.length === 0 ? (
          <p className="objective" style={{ color: "var(--muted)" }}>
            No CEO close entries in this period.
          </p>
        ) : (
          <div className="blocks">
            {closeEntries.map((d) => (
              <div className="blk" key={d.date} style={{ alignItems: "flex-start" }}>
                <time>{formatShort(d.date)}</time>
                <span className="b-what">
                  {(["ship", "learn", "opportunity"] as const).map((k) =>
                    (d.ceo_close?.[k] ?? "").trim() ? (
                      <span key={k} style={{ display: "block", marginBottom: 4 }}>
                        <b style={{ fontFamily: "var(--mono)", fontSize: 11, textTransform: "uppercase", color: "var(--brass)" }}>
                          {k === "ship" ? "shipped" : k === "learn" ? "learned" : "created"}
                        </b>{" "}
                        {d.ceo_close?.[k]}
                      </span>
                    ) : null
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {weeks.some((w) => (w.review ?? "").trim()) ? (
        <section>
          <div className="sec-h">
            <h2>Weekly reviews</h2>
            <span className="sec-note">your own words on pull</span>
          </div>
          <div className="blocks">
            {weeks
              .filter((w) => (w.review ?? "").trim())
              .map((w) => (
                <div className="blk" key={w.week_start} style={{ alignItems: "flex-start" }}>
                  <time>wk {w.week_n ?? "?"}</time>
                  <span className="b-what">{w.review}</span>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="sec-h">
          <h2>Lane scorecard</h2>
          <span className="sec-note">keep / pause / kill</span>
        </div>
        <ReviewNotes
          userId={user.id}
          checkpointDay={checkpoint.day}
          lanes={LANES}
          initialLanes={(reviewRes.data?.lanes as Record<string, { score?: number; decision?: string; note?: string }>) ?? {}}
          initialMemo={(reviewRes.data?.memo as string) ?? ""}
        />
      </section>

      <footer>
        <p className="rule">
          <b>Standing rule.</b> Do not confuse anxiety relief with evidence. The first acceptable
          job, flattering founder, or interesting idea does not automatically win. A role must beat
          the freedom. A side experiment must earn its hours.
        </p>
        <p className="save-note">
          Day {dayNumber(today)} of 90. This page rebuilds itself from what the daily board records.
        </p>
      </footer>
    </>
  );
}
