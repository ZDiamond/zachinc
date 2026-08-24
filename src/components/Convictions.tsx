"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ARGUMENT_PROMPT, type Conviction } from "@/lib/voice";

/**
 * The argument test.
 *
 * Heat is the signal, not correctness. Something you merely believe you can
 * write about twice; something you want to argue about you can write about all
 * year.
 */
export default function Convictions({
  userId,
  initial,
}: {
  userId: string;
  initial: Conviction[];
}) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const sb = supabaseBrowser();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setDraft("");
    const { data } = await sb
      .from("convictions")
      .insert({ user_id: userId, text })
      .select()
      .single();
    if (data) setRows((p) => [...p, data as Conviction]);
    setBusy(false);
  }

  async function setHeat(id: string, heat: number) {
    const next = rows.find((r) => r.id === id)?.heat === heat ? null : heat;
    setRows((p) => p.map((r) => (r.id === id ? { ...r, heat: next } : r)));
    await sb.from("convictions").update({ heat: next }).eq("id", id);
  }

  async function remove(id: string) {
    setRows((p) => p.filter((r) => r.id !== id));
    await sb.from("convictions").delete().eq("id", id);
  }

  const hot = rows.filter((r) => (r.heat ?? 0) >= 4).length;

  return (
    <>
      <div className="sec-h">
        <h2>What I argue about</h2>
        <span className="sec-note">
          {rows.length} written{hot ? ` - ${hot} with real heat` : ""}
        </span>
      </div>
      <p className="objective" style={{ color: "var(--muted)", marginBottom: 14 }}>
        {ARGUMENT_PROMPT}
      </p>

      <div className="todo-lane">
        {rows.length === 0 ? (
          <p className="sec-note" style={{ textAlign: "left", padding: "12px 0" }}>
            Empty. Aim for ten in fifteen minutes, without editing.
          </p>
        ) : null}

        {rows.map((r) => (
          <div className="conv" key={r.id}>
            <span className="c-text">{r.text}</span>
            <span className="heat">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  aria-pressed={r.heat === n}
                  onClick={() => setHeat(r.id, n)}
                  title={`Heat ${n}`}
                >
                  {n}
                </button>
              ))}
            </span>
            <button className="t-del" onClick={() => remove(r.id)} aria-label="Delete">
              &times;
            </button>
          </div>
        ))}

        <form className="todo-add" onSubmit={add}>
          <input
            type="text"
            value={draft}
            placeholder="Something you disagree with people about"
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="btn ghost small" type="submit" disabled={busy || !draft.trim()}>
            Add
          </button>
        </form>
      </div>
    </>
  );
}
