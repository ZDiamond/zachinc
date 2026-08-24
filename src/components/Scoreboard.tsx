"use client";

import { useState } from "react";
import { QUOTAS } from "@/lib/plan";
import { saveWeek, useDebouncedSave } from "@/lib/persist";
import SaveDot from "./SaveDot";

/**
 * The weekly scoreboard.
 *
 * Targets come from the plan doc. They are never raised automatically: the
 * Friday review proposes a raise after a streak and Zach decides. A plan he
 * wrote deliberately should not be edited by a counter.
 */
export default function Scoreboard({
  userId,
  weekStart,
  weekN,
  initialCounts,
  targets,
}: {
  userId: string;
  weekStart: string;
  weekN: number | null;
  initialCounts: Record<string, number>;
  targets: Record<string, number>;
}) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts ?? {});
  const [state, schedule] = useDebouncedSave<Record<string, number>>(
    (v) => saveWeek(userId, weekStart, weekN, { counts: v }),
    250
  );

  function bump(key: string, delta: number) {
    const next = { ...counts, [key]: Math.max(0, (counts[key] ?? 0) + delta) };
    setCounts(next);
    schedule(next);
  }

  const met = QUOTAS.filter((q) => (counts[q.key] ?? 0) >= (targets[q.key] ?? q.base)).length;

  return (
    <>
      <div className="sec-h">
        <h2>Weekly scoreboard</h2>
        <span className="sec-note">
          {met}/{QUOTAS.length} at target <SaveDot state={state} />
        </span>
      </div>
      <div className="score">
        {QUOTAS.map((q) => {
          const goal = targets[q.key] ?? q.base;
          const v = counts[q.key] ?? 0;
          const raised = goal > q.base;
          return (
            <div className={`tile ${v >= goal ? "met" : ""}`} key={q.key}>
              <div className="t-name">{q.name}</div>
              <div className="t-target">
                {q.label}
                {raised ? ` - raised to ${goal}` : ""}
              </div>
              <div className="counter">
                <button onClick={() => bump(q.key, -1)} aria-label={`Decrease ${q.name}`}>
                  &minus;
                </button>
                <span className="val">{v}</span>
                <button onClick={() => bump(q.key, 1)} aria-label={`Increase ${q.name}`}>
                  +
                </button>
                <span className="goal">/ {goal}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
