import { requireUser } from "@/lib/auth";
import { isoDate, formatLong } from "@/lib/dates";
import { missingCoreEnv } from "@/lib/env";
import { scoreAngles, readout, type Angle, type Conviction, type Piece } from "@/lib/voice";
import Header from "@/components/Header";
import Convictions from "@/components/Convictions";
import Angles from "@/components/Angles";
import Pieces from "@/components/Pieces";
import SetupNeeded from "@/components/SetupNeeded";

export const dynamic = "force-dynamic";

export default async function VoicePage() {
  const missing = missingCoreEnv();
  if (missing.length) return <SetupNeeded missing={missing} />;

  const { user, supabase } = await requireUser();
  const today = isoDate();

  const [convRes, angleRes, pieceRes] = await Promise.all([
    supabase
      .from("convictions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase.from("angles").select("*").eq("user_id", user.id).order("sort", { ascending: true }),
    supabase
      .from("pieces")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const convictions = (convRes.data ?? []) as Conviction[];
  const angles = (angleRes.data ?? []) as Angle[];
  const pieces = (pieceRes.data ?? []) as Piece[];

  const scores = scoreAngles(angles, pieces);

  return (
    <>
      <Header dateLabel={formatLong(today)} phase="Finding the voice" active="voice" />

      <section>
        <div className="sec-h">
          <h2>The experiment</h2>
          <span className="sec-note">answered by shipping, not deciding</span>
        </div>
        <p className="readout">{readout(scores)}</p>
        <div className="notes">
          <p>
            Ship three deliberately different pieces. Score each on two questions: did you want to
            write the next one immediately, and did it create a conversation, an intro, or inbound.
          </p>
          <p>
            The first question predicts whether you last a year. The second is the only reputation
            signal that has ever mattered here. Neither of them is likes.
          </p>
          <p>
            Weekly, not daily. Daily is Nelson&apos;s cadence and it belongs to a decision you have
            not made yet.
          </p>
        </div>
      </section>

      <section>
        <Convictions userId={user.id} initial={convictions} />
      </section>

      <section>
        <Angles userId={user.id} initial={angles} scores={scores} />
      </section>

      <section>
        <Pieces userId={user.id} today={today} initial={pieces} angles={angles} />
      </section>

      <footer>
        <p className="rule">
          <b>The trap.</b> The easiest thing for you to write is B2B marketing commentary. You would
          be fluent, it would perform adequately, and it would re-narrow you into the box you just
          spent two years being narrowed into. Fluency is not the same as conviction.
        </p>
      </footer>
    </>
  );
}
