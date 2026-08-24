"use client";

import { useState } from "react";
import { saveDay, useDebouncedSave } from "@/lib/persist";
import SaveDot from "./SaveDot";

/**
 * Daily floors. Keyed by the floor text rather than by index, so editing the
 * list in plan.ts never silently re-maps an old checkmark onto a new floor.
 */
export default function Floors({
  userId,
  date,
  items,
  initial,
  title,
  note,
}: {
  userId: string;
  date: string;
  items: string[];
  initial: Record<string, boolean>;
  title: string;
  note?: string;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>(initial ?? {});
  const [state, schedule] = useDebouncedSave<Record<string, boolean>>(
    (v) => saveDay(userId, date, { floors: v }),
    250
  );

  function toggle(key: string) {
    const next = { ...checked, [key]: !checked[key] };
    setChecked(next);
    schedule(next);
  }

  const metCount = items.filter((i) => checked[i]).length;

  return (
    <>
      <div className="sec-h">
        <h2>{title}</h2>
        <span className="sec-note">
          {metCount}/{items.length} <SaveDot state={state} />
        </span>
      </div>
      {note ? (
        <p className="sec-note" style={{ textAlign: "left", marginBottom: 8 }}>
          {note}
        </p>
      ) : null}
      <div>
        {items.map((f) => (
          <label className={`check ${checked[f] ? "done" : ""}`} key={f}>
            <input type="checkbox" checked={!!checked[f]} onChange={() => toggle(f)} />
            <span className="c-label">{f}</span>
          </label>
        ))}
      </div>
    </>
  );
}
