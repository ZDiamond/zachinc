"use client";

import { useState } from "react";
import { saveDay, useDebouncedSave } from "@/lib/persist";
import SaveDot from "./SaveDot";

/**
 * The three outcomes. Written at the CEO open, before the CRM is opened.
 * Yesterday's CEO close preloads them, so most mornings this is a review
 * rather than a blank page.
 */
export default function Outcomes({
  userId,
  date,
  initial,
  initialDone,
  preloaded,
}: {
  userId: string;
  date: string;
  initial: string[];
  initialDone: boolean[];
  preloaded: boolean;
}) {
  const [vals, setVals] = useState<string[]>(() => [0, 1, 2].map((i) => initial[i] ?? ""));
  const [done, setDone] = useState<boolean[]>(() => [0, 1, 2].map((i) => initialDone[i] ?? false));

  const [state, schedule] = useDebouncedSave<{ outcomes: string[]; outcomes_done: boolean[] }>(
    (v) => saveDay(userId, date, v)
  );

  function update(i: number, value: string) {
    const next = [...vals];
    next[i] = value;
    setVals(next);
    schedule({ outcomes: next, outcomes_done: done });
  }

  function toggle(i: number) {
    const next = [...done];
    next[i] = !next[i];
    setDone(next);
    schedule({ outcomes: vals, outcomes_done: next });
  }

  return (
    <>
      <div className="sec-h">
        <h2>Three outcomes</h2>
        <SaveDot state={state} />
      </div>
      {preloaded ? (
        <p className="sec-note" style={{ textAlign: "left", marginBottom: 10 }}>
          Carried over from last night&apos;s CEO close.
        </p>
      ) : null}
      {[0, 1, 2].map((i) => (
        <div className="outcome-row" key={i}>
          <span className="n">{i + 1}.</span>
          <input
            type="checkbox"
            checked={done[i]}
            onChange={() => toggle(i)}
            aria-label={`Outcome ${i + 1} complete`}
          />
          <input
            type="text"
            className={done[i] ? "done" : ""}
            value={vals[i]}
            placeholder="Outcome, not task"
            onChange={(e) => update(i, e.target.value)}
          />
        </div>
      ))}
    </>
  );
}
