"use client";

import { useState } from "react";
import { CURRENCIES } from "@/lib/plan";
import { saveWeek, useDebouncedSave } from "@/lib/persist";
import SaveDot from "./SaveDot";

/**
 * The optionality balance sheet, on the daily board rather than tucked into a
 * Friday ritual. Four currencies: runway, proof, relationships, reputation.
 * Count only material increases. Activity that moves none of these is a
 * candidate to cut.
 */
export default function Optionality({
  userId,
  weekStart,
  weekN,
  initial,
}: {
  userId: string;
  weekStart: string;
  weekN: number | null;
  initial: Record<string, number>;
}) {
  const [vals, setVals] = useState<Record<string, number>>(initial ?? {});
  const [state, schedule] = useDebouncedSave<Record<string, number>>(
    (v) => saveWeek(userId, weekStart, weekN, { currencies: v }),
    250
  );

  function bump(key: string, delta: number) {
    const next = { ...vals, [key]: Math.max(0, (vals[key] ?? 0) + delta) };
    setVals(next);
    schedule(next);
  }

  const moved = CURRENCIES.filter((c) => (vals[c.key] ?? 0) > 0).length;

  return (
    <>
      <div className="sec-h">
        <h2>Optionality balance sheet</h2>
        <span className="sec-note">
          {moved}/4 moved this week <SaveDot state={state} />
        </span>
      </div>
      <div className="optionality">
        {CURRENCIES.map((c) => (
          <div className="opt" key={c.key}>
            <div className="o-name">{c.name}</div>
            <div className="o-desc">{c.desc}</div>
            <div className="counter">
              <button onClick={() => bump(c.key, -1)} aria-label={`Decrease ${c.name}`}>
                &minus;
              </button>
              <span className="val">{vals[c.key] ?? 0}</span>
              <button onClick={() => bump(c.key, 1)} aria-label={`Increase ${c.name}`}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
