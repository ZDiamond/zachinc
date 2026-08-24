import { notFound } from "next/navigation";
import { buildDay, MIN } from "@/lib/day";
import { defaultSessionFor } from "@/lib/workout";
import { dayContext, phaseLabel, formatLong, addDays } from "@/lib/dates";
import { DAY_FOCUS, FLOORS_DAILY, QUOTAS, STANDING_RULE } from "@/lib/plan";

import Header from "@/components/Header";
import Dial from "@/components/Dial";
import Timeline from "@/components/Timeline";
import Outcomes from "@/components/Outcomes";
import Floors from "@/components/Floors";
import Todos from "@/components/Todos";
import Workout from "@/components/Workout";
import Scoreboard from "@/components/Scoreboard";
import Optionality from "@/components/Optionality";
import CeoClose from "@/components/CeoClose";
import Checkpoints from "@/components/Checkpoints";

/**
 * Design preview with representative data. Local only: this route does not
 * exist in production, so it can never be a way around the sign-in.
 */
export default function PreviewPage({ searchParams }: { searchParams: { date?: string } }) {
  if (process.env.NODE_ENV === "production") notFound();

  const today = searchParams.date ?? "2026-08-25";
  const ctx = dayContext(today);
  const focus = DAY_FOCUS[ctx.dow] ?? DAY_FOCUS[1];
  const scheduled = defaultSessionFor(ctx.dow);

  const plan = buildDay({
    dow: ctx.dow,
    session: scheduled,
    events: [
      { id: "1", title: "Davis - catch up + GTM sprint", start: MIN(12, 30), end: MIN(13, 15) },
      { id: "2", title: "Becky - integrated campaign pitch", start: MIN(13, 30), end: MIN(14, 30) },
      { id: "3", title: "Roadrunner AI - Joubin", start: MIN(16, 0), end: MIN(17, 0) },
    ],
  });

  const uid = "preview";

  return (
    <>
      <Header dateLabel={formatLong(today)} phase={phaseLabel(ctx)} active="board" />

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

      <section>
        <div className="sec-h">
          <h2>Today</h2>
          <span className="sec-note">
            {(plan.meetingMinutes / 60).toFixed(1)}h booked - {plan.deepWorkMinutes}m deep work
          </span>
        </div>
        <Timeline plan={plan} />
      </section>

      <section>
        <div className="grid2">
          <div>
            <Outcomes
              userId={uid}
              date={today}
              initial={[
                "Bridge offer v1 in a shape Becky could forward without edits",
                "Roadrunner status moved from warm to a dated next step",
                "",
              ]}
              initialDone={[true, false, false]}
              preloaded
            />
          </div>
          <div>
            <Floors
              userId={uid}
              date={today}
              items={FLOORS_DAILY}
              initial={{ [FLOORS_DAILY[0]]: true, [FLOORS_DAILY[1]]: true }}
              title="Daily floors"
            />
          </div>
        </div>
      </section>

      <section>
        <Todos
          userId={uid}
          today={today}
          initial={[
            { id: "a", title: "Sign termination agreement (lawyer cleared it)", done: false, added_on: "2026-08-24", sort: 0 },
            { id: "b", title: "Chase Yihan on the third retention tranche", done: false, added_on: "2026-08-18", sort: 1 },
            { id: "c", title: "COBRA enrollment paperwork", done: false, added_on: "2026-08-24", sort: 2 },
            { id: "d", title: "Personal copies of every employment doc filed", done: true, added_on: "2026-08-21", sort: 3 },
          ]}
        />
      </section>

      <section>
        <Workout
          userId={uid}
          date={today}
          scheduled={scheduled}
          initialKey={null}
          initialDone={false}
          liftsDoneThisWeek={["upper_a"]}
        />
      </section>

      <section>
        <Scoreboard
          userId={uid}
          weekStart={ctx.weekStart}
          weekN={ctx.week?.n ?? null}
          initialCounts={{ conversations: 3, outbound: 7, artifacts: 0, operator_interviews: 1, rabbi_ari: 2, commercial_asks: 1 }}
          targets={Object.fromEntries(QUOTAS.map((q) => [q.key, q.base]))}
        />
      </section>

      <section>
        <Optionality
          userId={uid}
          weekStart={ctx.weekStart}
          weekN={ctx.week?.n ?? null}
          initial={{ runway: 0, proof: 1, relationships: 3, reputation: 1 }}
        />
      </section>

      <section>
        <CeoClose
          userId={uid}
          date={today}
          tomorrow={addDays(today, 1)}
          initial={{
            ship: "Bridge offer v1. One page, four-week scope, proof metric named.",
            learn: "Two founders described the same problem in almost the same words. That is the offer.",
            opportunity: "Becky asked what a paid version would cost. Did not have a number ready.",
            tomorrow: "Price the sprint and send it to Becky\nTwo operator interview requests out\nRoadrunner: ask for the decision timeline",
          }}
          initialProof="Becky asked for pricing unprompted. First real buying signal."
        />
      </section>

      <section>
        <Checkpoints today={today} />
      </section>

      <footer>
        <p className="rule">
          <b>Standing rule.</b> {STANDING_RULE}
        </p>
        <p className="save-note">Preview with sample data. Nothing here saves.</p>
      </footer>
    </>
  );
}
