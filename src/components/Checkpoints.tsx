import { CHECKPOINTS } from "@/lib/plan";
import { formatShort } from "@/lib/dates";

/** Day 30 / 60 / 90. Pass or fail against evidence, not against the story. */
export default function Checkpoints({ today }: { today: string }) {
  const next = CHECKPOINTS.find((c) => c.date >= today);
  return (
    <>
      <div className="sec-h">
        <h2>Checkpoints</h2>
        <span className="sec-note">evidence, not vibes</span>
      </div>
      <div className="cps">
        {CHECKPOINTS.map((c) => (
          <div className={`cp ${c === next ? "next" : ""}`} key={c.day}>
            <div className="cp-day">
              {c.label}
              {c === next ? " - next" : ""}
            </div>
            <div className="cp-date">{formatShort(c.date)}</div>
            <ul>
              {c.evidence.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <div className="cp-decision">{c.decision}</div>
          </div>
        ))}
      </div>
    </>
  );
}
