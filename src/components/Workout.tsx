"use client";

import { useState } from "react";
import { SESSIONS, WEEKLY_REQUIREMENT, type Session } from "@/lib/workout";
import { saveDay } from "@/lib/persist";

/**
 * Training.
 *
 * The program says Monday is Upper A, but the week drifts. So the board shows
 * the scheduled session, lets Zach log whichever one he actually did, and
 * tracks what the week still owes rather than pretending the calendar held.
 */
export default function Workout({
  userId,
  date,
  scheduled,
  initialKey,
  initialDone,
  liftsDoneThisWeek,
}: {
  userId: string;
  date: string;
  scheduled: Session;
  initialKey: string | null;
  initialDone: boolean;
  liftsDoneThisWeek: string[];
}) {
  const [key, setKey] = useState<string>(initialKey ?? scheduled.key);
  const [done, setDone] = useState(initialDone);
  const session = SESSIONS[key] ?? scheduled;

  async function setSession(next: string) {
    setKey(next);
    await saveDay(userId, date, { workout_key: next, workout_done: done });
  }

  async function toggleDone() {
    const next = !done;
    setDone(next);
    await saveDay(userId, date, { workout_key: key, workout_done: next });
  }

  const owed = WEEKLY_REQUIREMENT.lifts.filter(
    (k) => !liftsDoneThisWeek.includes(k) && !(done && k === key)
  );

  return (
    <>
      <div className="sec-h">
        <h2>Training</h2>
        <span className="sec-note">{session.minutes}</span>
      </div>
      <div className="workout">
        <label className={`check ${done ? "done" : ""}`} style={{ borderBottom: "none", paddingTop: 0 }}>
          <input type="checkbox" checked={done} onChange={toggleDone} />
          <span className="c-label">
            <strong>{session.name}</strong>
            {key !== scheduled.key ? ` (swapped from ${scheduled.name})` : ""}
          </span>
        </label>

        {session.exercises.length > 0 ? (
          <table>
            <tbody>
              {session.exercises.map((e) => (
                <tr key={e.name}>
                  <td>{e.name}</td>
                  <td>{e.sets}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {session.goal ? <p className="w-cue">{session.goal}</p> : null}
        {session.cues?.map((c) => (
          <p className="w-cue" key={c}>
            {c}
          </p>
        ))}

        {owed.length > 0 ? (
          <p className="workout-remaining">
            Still owed this week: {owed.map((k) => SESSIONS[k].name).join(", ")}
          </p>
        ) : (
          <p className="workout-remaining">All four lifts done this week.</p>
        )}

        <div className="todo-add">
          <select
            value={key}
            onChange={(e) => setSession(e.target.value)}
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              padding: "6px 8px",
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderRadius: 3,
              color: "var(--ink)",
            }}
          >
            {Object.values(SESSIONS).map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
