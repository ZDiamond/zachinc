import { requireUser } from "@/lib/auth";
import { isoDate, formatLong, addDays, TZ } from "@/lib/dates";
import { fetchMeetingsInRange } from "@/lib/google";
import { buildSuggestions } from "@/lib/suggestions";
import { missingCoreEnv } from "@/lib/env";
import { LANES, type Opportunity } from "@/lib/crm";
import Header from "@/components/Header";
import Crm from "@/components/Crm";
import CalendarSuggestions from "@/components/CalendarSuggestions";
import SetupNeeded from "@/components/SetupNeeded";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const missing = missingCoreEnv();
  if (missing.length) return <SetupNeeded missing={missing} />;

  const { user, supabase } = await requireUser();
  const today = isoDate();

  // Look back two weeks and forward one: recent meetings are the ones Zach can
  // still judge, and upcoming ones are worth having in the CRM before they happen.
  const [oppRes, ignoredRes, calendar] = await Promise.all([
    supabase
      .from("opportunities")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase.from("ignored_contacts").select("email").eq("user_id", user.id),
    fetchMeetingsInRange(user.id, addDays(today, -14), addDays(today, 7), TZ),
  ]);

  const rows = (oppRes.data ?? []) as Opportunity[];

  const { newPeople, contactUpdates } = buildSuggestions({
    meetings: calendar.meetings,
    opportunities: rows,
    ignoredEmails: (ignoredRes.data ?? []).map((r: { email: string }) => r.email),
    today,
  });

  return (
    <>
      <Header dateLabel={formatLong(today)} phase="Opportunity CRM" active="crm" />

      {newPeople.length || contactUpdates.length || calendar.error ? (
        <section>
          <CalendarSuggestions
            userId={user.id}
            newPeople={newPeople}
            contactUpdates={contactUpdates}
            error={calendar.error ?? null}
          />
        </section>
      ) : null}

      <section>
        <Crm userId={user.id} today={today} initial={rows} />
      </section>

      <section>
        <div className="sec-h">
          <h2>The rules this enforces</h2>
          <span className="sec-note">from the plan doc</span>
        </div>
        <div className="notes">
          <p>Every conversation ends with one explicit next step: an intro, a meeting, a proposal, a pilot, or a clear no.</p>
          <p>Follow up within 24 hours. Never let warm interest age in the inbox.</p>
          <p>No ambiguous warm lead older than seven days.</p>
          <p>Log every substantive conversation the same day: what they need, what energized you, what they offered, who they can introduce, and the next step.</p>
        </div>
      </section>

      <section>
        <div className="sec-h">
          <h2>Lanes</h2>
          <span className="sec-note">what each one is for</span>
        </div>
        <div className="blocks">
          {LANES.map((l) => (
            <div className="blk" key={l.key}>
              <span className="b-name" style={{ width: 190 }}>{l.name}</span>
              <span className="b-what">{l.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <footer>
        <p className="rule">
          <b>Tier 1 is a promise, not a compliment.</b> If a record has sat at tier 1 for two weeks
          with no next step, it is tier 3 and the board is just being polite about it.
        </p>
      </footer>
    </>
  );
}
