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
import Crm from "@/components/Crm";
import PipelineAlert from "@/components/PipelineAlert";
import type { Opportunity } from "@/lib/crm";

/**
 * Design preview with representative data. Local only: this route does not
 * exist in production, so it can never be a way around the sign-in.
 */

const SAMPLE_OPPS: Opportunity[] = [
  { id: "1", name: "Joubin", org: "Roadrunner AI", lane: "roles", tier: 1, strength: 4, energy: 5,
    value: "Head of GTM, founder-facing", currency: "runway", status: "active",
    next_step: "Ask for the decision timeline and written charter", next_step_on: "2026-08-24",
    last_contact_on: "2026-08-21", notes: "" },
  { id: "2", name: "Becky", org: "", lane: "advisory", tier: 1, strength: 5, energy: 4,
    value: "Integrated campaign sprint, 4 weeks", currency: "runway", status: "proposal",
    next_step: "Send pricing for the sprint", next_step_on: "2026-08-21",
    last_contact_on: "2026-08-20", notes: "" },
  { id: "3", name: "Davis", org: "", lane: "network", tier: 1, strength: 4, energy: 4,
    value: "Two founder intros", currency: "relationships", status: "active",
    next_step: "", next_step_on: null, last_contact_on: "2026-08-24", notes: "" },
  { id: "4", name: "Carla Mendez", org: "Mendez HVAC", lane: "substance", tier: 2, strength: 1,
    energy: 3, value: "Operator interview 1 of 6", currency: "proof", status: "new",
    next_step: "Book the workflow walkthrough", next_step_on: "2026-08-27",
    last_contact_on: null, notes: "" },
  { id: "5", name: "Nicole", org: "Cognition", lane: "network", tier: 2, strength: 5, energy: 3,
    value: "Reference language in writing", currency: "reputation", status: "active",
    next_step: "Get the agreed narrative in writing", next_step_on: null,
    last_contact_on: "2026-08-14", notes: "" },
];

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
        <PipelineAlert rows={SAMPLE_OPPS} today={today} />
      </section>

      <section>
        <Crm userId={uid} today={today} initial={SAMPLE_OPPS} />
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
