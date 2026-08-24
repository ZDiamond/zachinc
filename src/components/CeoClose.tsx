"use client";

import { useState } from "react";
import { saveDay, useDebouncedSave } from "@/lib/persist";
import SaveDot from "./SaveDot";

const FIELDS: [string, string, string][] = [
  ["ship", "What did I ship?", ""],
  ["learn", "What did I learn?", ""],
  ["opportunity", "What opportunity did I create?", ""],
  [
    "tomorrow",
    "Tomorrow's three outcomes",
    "One per line. These load into tomorrow morning automatically.",
  ],
];

/**
 * The CEO close.
 *
 * The four questions come straight from the transfer doc. What is written in
 * "tomorrow" is saved onto tomorrow's row, so the next morning opens with the
 * outcomes already there instead of a blank page.
 */
export default function CeoClose({
  userId,
  date,
  tomorrow,
  initial,
  initialProof,
}: {
  userId: string;
  date: string;
  tomorrow: string;
  initial: Record<string, string>;
  initialProof: string;
}) {
  const [vals, setVals] = useState<Record<string, string>>(initial ?? {});
  const [proof, setProof] = useState(initialProof ?? "");

  const [state, schedule] = useDebouncedSave<{ close: Record<string, string>; proof: string }>(
    async (v) => {
      await saveDay(userId, date, { ceo_close: v.close, commercial_proof: v.proof });

      // Push tomorrow's outcomes forward. Only fill blanks: if tomorrow's row
      // already has outcomes typed, they win over anything drafted tonight.
      const lines = (v.close.tomorrow ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
      if (lines.length) {
        const { supabaseBrowser } = await import("@/lib/supabase/client");
        const sb = supabaseBrowser();
        const { data: existing } = await sb
          .from("days")
          .select("outcomes")
          .eq("user_id", userId)
          .eq("date", tomorrow)
          .maybeSingle();

        const current = (existing?.outcomes as string[] | undefined) ?? ["", "", ""];
        if (!current.some((s) => (s ?? "").trim())) {
          await sb.from("days").upsert(
            {
              user_id: userId,
              date: tomorrow,
              outcomes: [lines[0] ?? "", lines[1] ?? "", lines[2] ?? ""],
            },
            { onConflict: "user_id,date" }
          );
        }
      }
    },
    900
  );

  function update(key: string, value: string) {
    const next = { ...vals, [key]: value };
    setVals(next);
    schedule({ close: next, proof });
  }

  function updateProof(value: string) {
    setProof(value);
    schedule({ close: vals, proof: value });
  }

  return (
    <>
      <div className="sec-h">
        <h2>CEO close</h2>
        <SaveDot state={state} />
      </div>
      <div className="review-grid">
        {FIELDS.map(([key, label, hint], i) => (
          <div className={`review-item ${i === 3 ? "full" : ""}`} key={key}>
            <label htmlFor={`rev_${key}`}>{label}</label>
            <textarea
              id={`rev_${key}`}
              value={vals[key] ?? ""}
              placeholder={hint}
              onChange={(e) => update(key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="proof-field">
        <label htmlFor="commercialProof">Commercial proof created</label>
        <div className="hint">
          Sourced X, influenced $Y pipeline, closed Z, improved conversion, booked executive
          meetings. Blank is fine if none was created today.
        </div>
        <input
          id="commercialProof"
          type="text"
          value={proof}
          placeholder="What measurable proof did today's work create?"
          onChange={(e) => updateProof(e.target.value)}
        />
      </div>
    </>
  );
}
