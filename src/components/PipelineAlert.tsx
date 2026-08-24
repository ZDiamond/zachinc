import Link from "next/link";
import { formatShort } from "@/lib/dates";
import {
  flagFor,
  daysQuiet,
  laneName,
  LIVE_STATUSES,
  AGING_DAYS,
  FLAG_LABEL,
  type Opportunity,
} from "@/lib/crm";

/**
 * What the pipeline needs today, on the daily board.
 *
 * A CRM you have to remember to open is a CRM you stop opening. The daily
 * floors already say every conversation gets a dated next step and no warm
 * lead ages past a week, so the board states plainly where that is not true.
 */
export default function PipelineAlert({
  rows,
  today,
}: {
  rows: Opportunity[];
  today: string;
}) {
  const flagged = rows
    .map((o) => ({ o, flag: flagFor(o, today), quiet: daysQuiet(o, today) }))
    .filter(
      (x) => x.flag !== null || (LIVE_STATUSES.includes(x.o.status) && (x.quiet ?? 0) >= AGING_DAYS)
    )
    .sort((a, b) => {
      const rank = (f: string | null) =>
        f === "no_next_step" ? 0 : f === "overdue" ? 1 : f === "no_date" ? 2 : 3;
      return rank(a.flag) - rank(b.flag);
    });

  const dueToday = rows.filter(
    (o) => LIVE_STATUSES.includes(o.status) && o.next_step_on === today
  );

  return (
    <>
      <div className="sec-h">
        <h2>Pipeline</h2>
        <span className="sec-note">
          <Link href="/crm" style={{ color: "var(--muted)" }}>
            open the CRM
          </Link>
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="crm-empty">
          Nothing in the CRM yet. <Link href="/crm">Add the first people</Link> before the outbound
          block.
        </p>
      ) : (
        <>
          {dueToday.length > 0 ? (
            <div className="blocks" style={{ marginBottom: flagged.length ? 12 : 0 }}>
              {dueToday.map((o) => (
                <div className="blk" key={o.id}>
                  <time>due today</time>
                  <span className="b-name" style={{ width: 150 }}>{o.name}</span>
                  <span className="b-what">{o.next_step}</span>
                </div>
              ))}
            </div>
          ) : null}

          {flagged.length === 0 ? (
            <p className="crm-empty" style={{ padding: "8px 0" }}>
              {dueToday.length
                ? "Nothing else is drifting."
                : "Every live opportunity has a dated next step. Nothing is aging."}
            </p>
          ) : (
            <>
              <div className="blocks">
                {flagged.slice(0, 6).map(({ o, flag, quiet }) => (
                  <div className="blk" key={o.id}>
                    <time className={flag === "overdue" ? "" : ""}>
                      {flag ? FLAG_LABEL[flag] : `quiet ${quiet}d`}
                    </time>
                    <span className="b-name" style={{ width: 150 }}>{o.name}</span>
                    <span className="b-what">
                      {o.next_step || laneName(o.lane)}
                      {o.next_step_on && flag === "overdue"
                        ? ` - was due ${formatShort(o.next_step_on)}`
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
              {flagged.length > 6 ? (
                <div className="notes">
                  <p>
                    {flagged.length - 6} more need attention. <Link href="/crm">Open the CRM.</Link>
                  </p>
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </>
  );
}
