import { requireUser } from "@/lib/auth";
import { fetchDayEvents } from "@/lib/google";
import { buildDay } from "@/lib/day";
import { defaultSessionFor, SESSIONS } from "@/lib/workout";
import {
  TZ,
  isoDate,
  addDays,
  dayContext,
  phaseLabel,
  formatLong,
} from "@/lib/dates";
import {
  DAY_FOCUS,
  FLOORS_DAILY,
  FLOORS_FRIDAY,
  QUOTAS,
  STANDING_RULE,
  WEEK_ZERO_ITEMS,
} from "@/lib/plan";

import Header from "@/components/Header";
import Dial from "@/components/Dial";
import Timeline from "@/components/Timeline";
import Outcomes from "@/components/Outcomes";
import Floors from "@/components/Floors";
import Todos, { type Todo } from "@/components/Todos";
import Workout from "@/components/Workout";
import Scoreboard from "@/components/Scoreboard";
import Optionality from "@/components/Optionality";
import CeoClose from "@/components/CeoClose";
import Checkpoints from "@/components/Checkpoints";
import CalendarNotice from "@/components/CalendarNotice";
import SetupNeeded from "@/components/SetupNeeded";
import { missingCoreEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const BANNERS: Record<string, { title: string; body: string }> = {
  pre: {
    title: "Not yet.",
    body: "Exit week begins Monday, August 17. Until then, this board is dark.",
  },
  decompress: {
    title: "Breathe.",
    body: "Cognition is done. The plan starts Monday. Dogs, cooking, fishing, records. This rest is scheduled, not stolen.",
  },
  weekend: {
    title: "Off. Fully.",
    body: "Weekends are off. The plan works because the rest is real. Rabbi Ari delivery is the only exception while the pilot is live.",
  },
  wedding: {
    title: "Wedding week.",
    body: "Maintenance only. Inbox triaged once a day, urgent process moves only, no new initiatives. October 10 is the headline of 2026. Act like it.",
  },
  after: {
    title: "Day 90 is done.",
    body: "Board memo time: what worked, what did not, what you are committing to through the honeymoon, and what gets explicitly stopped. Then Sri Lanka.",
  },
};

export default async function BoardPage() {
  const missing = missingCoreEnv();
  if (missing.length) return <SetupNeeded missing={missing} />;

  const { user, supabase } = await requireUser();

  const today = isoDate();
  const tomorrow = addDays(today, 1);
  const ctx = dayContext(today);

  // Everything this page needs, in parallel.
  const [dayRes, weekRes, todoRes, weekDaysRes, calendar] = await Promise.all([
    supabase.from("days").select("*").eq("user_id", user.id).eq("date", today).maybeSingle(),
    supabase
      .from("weeks")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", ctx.weekStart)
      .maybeSingle(),
    supabase
      .from("todos")
      .select("*")
      .eq("user_id", user.id)
      .or(`done.eq.false,done_at.gte.${today}T00:00:00Z`)
      .order("sort", { ascending: true }),
    supabase
      .from("days")
      .select("date, workout_key, workout_done")
      .eq("user_id", user.id)
      .gte("date", ctx.weekStart)
      .lte("date", addDays(ctx.weekStart, 6)),
    fetchDayEvents(user.id, today, TZ),
  ]);

  const day = dayRes.data ?? null;
  const week = weekRes.data ?? null;
  const todos = (todoRes.data ?? []) as Todo[];

  const liftsDoneThisWeek = (weekDaysRes.data ?? [])
    .filter((d: { workout_done: boolean; workout_key: string | null }) => d.workout_done && d.workout_key)
    .map((d: { workout_key: string | null }) => d.workout_key as string)
    .filter((k: string) => SESSIONS[k]?.kind === "lift");

  const dateLabel = formatLong(today);
  const phase = phaseLabel(ctx);
  const banner = BANNERS[ctx.mode];

  // Non-working days get a banner and the to-do lane, nothing else. The rest
  // of the board would just be an invitation to work on a day that is off.
  if (banner) {
    return (
      <>
        <Header dateLabel={dateLabel} phase={phase} active="board" />
        <div className="banner">
          <h1>{banner.title}</h1>
          <p>{banner.body}</p>
        </div>
        <section>
          <Todos userId={user.id} today={today} initial={todos} />
        </section>
        <Footer />
      </>
    );
  }

  if (ctx.mode === "holiday") {
    return (
      <>
        <Header dateLabel={dateLabel} phase={phase} active="board" />
        <div className="banner">
          <h1>{ctx.holidayName}. Off.</h1>
          <p>
            No career sprint today. Keep only genuinely time-sensitive live-process work. The
            operating system resumes tomorrow.
          </p>
        </div>
        <section>
          <Todos userId={user.id} today={today} initial={todos} />
        </section>
        <Footer />
      </>
    );
  }

  if (ctx.mode === "week0") {
    return (
      <>
        <Header dateLabel={dateLabel} phase={phase} active="board" />
        <div className="hero">
          <div className="dial">
            <Dial dayNum={0} progress={0} />
          </div>
          <div className="hero-copy">
            <div className="eyebrow">Week 0 - Aug 17-21 - Before Day 1</div>
            <h1>Exit week. The highest-dollar week of the plan.</h1>
            <p className="objective">
              The tranche, equity, and severance outcome is the first optionality currency.
              Everything in writing. Exit impeccably.
            </p>
            <p className="proof">
              <b>Rule:</b> The last day is not the signing deadline. Nothing gets signed before
              lawyer review.
            </p>
          </div>
        </div>
        <section>
          <Floors
            userId={user.id}
            date={today}
            items={WEEK_ZERO_ITEMS}
            initial={(day?.floors as Record<string, boolean>) ?? {}}
            title="Exit checklist"
          />
        </section>
        <section>
          <Todos userId={user.id} today={today} initial={todos} />
        </section>
        <Footer />
      </>
    );
  }

  // A normal working day.
  const focus = DAY_FOCUS[ctx.dow] ?? DAY_FOCUS[1];
  const scheduled = defaultSessionFor(ctx.dow);
  const plan = buildDay({ dow: ctx.dow, events: calendar.events, session: scheduled });

  const floors = ctx.dow === 5 ? [...FLOORS_DAILY, ...FLOORS_FRIDAY] : FLOORS_DAILY;

  const outcomes = (day?.outcomes as string[]) ?? ["", "", ""];
  const preloaded = !day?.updated_at && outcomes.some((o) => (o ?? "").trim());

  const targets: Record<string, number> = {};
  for (const q of QUOTAS) {
    const override = (week?.targets as Record<string, number> | undefined)?.[q.key];
    targets[q.key] = typeof override === "number" ? override : q.base;
  }

  return (
    <>
      <Header dateLabel={dateLabel} phase={phase} active="board" />

      <div className="hero">
        <div className="dial">
          <Dial dayNum={ctx.dayNum} progress={ctx.progress} />
        </div>
        <div className="hero-copy">
          <div className="eyebrow">
            Week {ctx.week?.n} - {focus.name}
          </div>
          <h1>{ctx.week ? ctx.week.objective.split(".")[0] + "." : "Zach Inc."}</h1>
          <p className="objective">{focus.what}</p>
          {ctx.week ? (
            <p className="proof">
              <b>Proof by Friday:</b> {ctx.week.proof}
            </p>
          ) : null}
        </div>
      </div>

      {ctx.checkpoint ? (
        <section>
          <div className="sec-h">
            <h2>{ctx.checkpoint.label} board meeting</h2>
            <span className="sec-note">{ctx.checkpoint.decision}</span>
          </div>
          <div className="notes">
            {ctx.checkpoint.evidence.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="sec-h">
          <h2>Today</h2>
          <span className="sec-note">
            {plan.meetingMinutes > 0
              ? `${(plan.meetingMinutes / 60).toFixed(1)}h booked`
              : "nothing booked"}{" "}
            - {plan.deepWorkMinutes}m deep work
          </span>
        </div>
        <CalendarNotice error={calendar.error ?? null} />
        <Timeline plan={plan} />
      </section>

      <section>
        <div className="grid2">
          <div>
            <Outcomes
              userId={user.id}
              date={today}
              initial={outcomes}
              initialDone={(day?.outcomes_done as boolean[]) ?? [false, false, false]}
              preloaded={!!preloaded}
            />
          </div>
          <div>
            <Floors
              userId={user.id}
              date={today}
              items={floors}
              initial={(day?.floors as Record<string, boolean>) ?? {}}
              title="Daily floors"
              note={ctx.dow === 5 ? "Friday adds to the floors. It does not replace them." : undefined}
            />
          </div>
        </div>
      </section>

      <section>
        <Todos userId={user.id} today={today} initial={todos} />
      </section>

      <section>
        <Workout
          userId={user.id}
          date={today}
          scheduled={scheduled}
          initialKey={(day?.workout_key as string) ?? null}
          initialDone={!!day?.workout_done}
          liftsDoneThisWeek={liftsDoneThisWeek}
        />
      </section>

      <section>
        <Scoreboard
          userId={user.id}
          weekStart={ctx.weekStart}
          weekN={ctx.week?.n ?? null}
          initialCounts={(week?.counts as Record<string, number>) ?? {}}
          targets={targets}
        />
      </section>

      <section>
        <Optionality
          userId={user.id}
          weekStart={ctx.weekStart}
          weekN={ctx.week?.n ?? null}
          initial={(week?.currencies as Record<string, number>) ?? {}}
        />
      </section>

      <section>
        <CeoClose
          userId={user.id}
          date={today}
          tomorrow={tomorrow}
          initial={(day?.ceo_close as Record<string, string>) ?? {}}
          initialProof={(day?.commercial_proof as string) ?? ""}
        />
      </section>

      <section>
        <Checkpoints today={today} />
      </section>

      <Footer />
    </>
  );
}

function Footer() {
  return (
    <footer>
      <p className="rule">
        <b>Standing rule.</b> {STANDING_RULE}
      </p>
      <p className="save-note">
        Everything saves to your account, so the board is the same on your laptop and your phone.
      </p>
    </footer>
  );
}
