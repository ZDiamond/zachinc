"use client";

import { useEffect, useState } from "react";
import { fmtRange, type DayPlan } from "@/lib/day";
import { minutesOfDay } from "@/lib/dates";

/**
 * Today's shape. The current block is highlighted and the clock ticks, so the
 * board is useful at a glance without a refresh.
 */
export default function Timeline({ plan }: { plan: DayPlan }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(minutesOfDay());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div className="blocks">
        {plan.blocks.map((b) => {
          const isPast = now !== null && now >= b.end;
          const isNow = now !== null && now >= b.start && now < b.end;
          const cls = ["blk", `kind-${b.kind}`, isPast ? "past" : "", isNow ? "now" : ""]
            .filter(Boolean)
            .join(" ");
          return (
            <div className={cls} key={b.key}>
              <time>{fmtRange(b.start, b.end)}</time>
              <span className="b-name">
                {b.name}
                {isNow ? <span className="now-tag">NOW</span> : null}
                {b.squeezed ? <span className="squeeze-tag">short</span> : null}
              </span>
              <span className="b-what">{b.what}</span>
            </div>
          );
        })}
      </div>

      {plan.notes.length > 0 ? (
        <div className="notes">
          {plan.notes.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
        </div>
      ) : null}
    </>
  );
}
