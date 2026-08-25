import { requireUser } from "@/lib/auth";
import { isoDate, formatLong } from "@/lib/dates";
import { missingCoreEnv } from "@/lib/env";
import { CONDITIONS, type Assessment } from "@/lib/substance";
import Header from "@/components/Header";
import Substance from "@/components/Substance";
import SetupNeeded from "@/components/SetupNeeded";

export const dynamic = "force-dynamic";

export default async function SubstancePage() {
  const missing = missingCoreEnv();
  if (missing.length) return <SetupNeeded missing={missing} />;

  const { user, supabase } = await requireUser();
  const today = isoDate();

  const { data } = await supabase
    .from("substance_assessments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <>
      <Header dateLabel={formatLong(today)} phase="The substance filter" active="substance" />

      <section>
        <div className="sec-h">
          <h2>The filter</h2>
          <span className="sec-note">Section 8, made usable</span>
        </div>
        <p className="objective">
          Substance is work that satisfies at least one of three conditions. One is enough to
          qualify. Zero is the finding that matters.
        </p>
        <div className="blocks" style={{ marginTop: 14 }}>
          {CONDITIONS.map((c) => (
            <div className="blk" key={c.key} style={{ alignItems: "flex-start" }}>
              <span className="b-name" style={{ width: 190 }}>{c.name}</span>
              <span className="b-what">{c.test}</span>
            </div>
          ))}
        </div>
        <div className="notes">
          <p>
            Point it at a business and it says whether the value survives cheap coordination. Point
            it at a role and it says whether the job is substance or scaffolding, which is the
            sharpest question you can ask about a job offer.
          </p>
          <p>
            The second half is the compressible layer: where skilled people lose time to quoting,
            scheduling, follow-up, and coordination. Substance plus a named compressible layer is
            the operating case. Own the part that cannot be automated, compress the part that can.
          </p>
        </div>
      </section>

      <section>
        <Substance userId={user.id} initial={(data ?? []) as Assessment[]} />
      </section>

      <footer>
        <p className="rule">
          <b>The filter cuts both ways.</b> Applied to your own work it explains why deal-making,
          executive rooms and narrative are durable assets while campaign operations are not. A role
          that scores zero is a coordination job, whatever the title says.
        </p>
      </footer>
    </>
  );
}
