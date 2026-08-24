"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { HEADLINE_TARGET, type Angle, type AngleScore } from "@/lib/voice";

/**
 * Candidate angles and the twenty-headline test.
 *
 * The count is the point. An angle that stalls at six headlines has told you
 * something now, for the cost of twenty minutes, rather than in March.
 */
export default function Angles({
  userId,
  initial,
  scores,
}: {
  userId: string;
  initial: Angle[];
  scores: AngleScore[];
}) {
  const [rows, setRows] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newAngle, setNewAngle] = useState("");
  const sb = supabaseBrowser();

  async function addHeadline(angle: Angle, e: React.FormEvent) {
    e.preventDefault();
    const text = (drafts[angle.id] ?? "").trim();
    if (!text) return;
    const headlines = [...angle.headlines, text];
    setRows((p) => p.map((a) => (a.id === angle.id ? { ...a, headlines } : a)));
    setDrafts({ ...drafts, [angle.id]: "" });
    await sb.from("angles").update({ headlines }).eq("id", angle.id);
  }

  async function removeHeadline(angle: Angle, index: number) {
    const headlines = angle.headlines.filter((_, i) => i !== index);
    setRows((p) => p.map((a) => (a.id === angle.id ? { ...a, headlines } : a)));
    await sb.from("angles").update({ headlines }).eq("id", angle.id);
  }

  async function addAngle(e: React.FormEvent) {
    e.preventDefault();
    const name = newAngle.trim();
    if (!name) return;
    setNewAngle("");
    const sort = rows.length ? Math.max(...rows.map((r) => r.sort)) + 1 : 0;
    const { data } = await sb
      .from("angles")
      .insert({ user_id: userId, name, sort })
      .select()
      .single();
    if (data) setRows((p) => [...p, data as Angle]);
  }

  return (
    <>
      <div className="sec-h">
        <h2>Candidate angles</h2>
        <span className="sec-note">{HEADLINE_TARGET} headlines or it cannot go the distance</span>
      </div>

      {rows.map((angle) => {
        const score = scores.find((s) => s.angle.id === angle.id);
        const n = angle.headlines.length;
        const full = n >= HEADLINE_TARGET;
        return (
          <div className={`angle ${full ? "tested" : ""}`} key={angle.id}>
            <div className="angle-head">
              <span className="angle-name">{angle.name}</span>
              <span className={`angle-count ${full ? "full" : ""}`}>
                {n}/{HEADLINE_TARGET} headlines
              </span>
            </div>
            {angle.description ? <p className="angle-desc">{angle.description}</p> : null}
            {score && score.shipped > 0 ? (
              <p className="angle-score">
                {score.shipped} shipped - {score.wantedNext} made you want the next one -{" "}
                {score.createdPull} created pull
              </p>
            ) : null}

            {n > 0 ? (
              <ul className="headlines">
                {angle.headlines.map((h, i) => (
                  <li key={`${angle.id}-${i}`}>
                    <span className="hl-n">{i + 1}</span>
                    {h}
                    <button onClick={() => removeHeadline(angle, i)} aria-label="Remove headline">
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <form className="add-row" onSubmit={(e) => addHeadline(angle, e)}>
              <input
                type="text"
                value={drafts[angle.id] ?? ""}
                placeholder={n === 0 ? "First headline. Do not overthink it." : "Next headline"}
                onChange={(e) => setDrafts({ ...drafts, [angle.id]: e.target.value })}
              />
              <button className="btn ghost small" type="submit">
                Add
              </button>
            </form>
          </div>
        );
      })}

      <form className="add-row" onSubmit={addAngle}>
        <input
          type="text"
          value={newAngle}
          placeholder="Another angle worth testing"
          onChange={(e) => setNewAngle(e.target.value)}
        />
        <button className="btn ghost small" type="submit" disabled={!newAngle.trim()}>
          Add angle
        </button>
      </form>
    </>
  );
}
