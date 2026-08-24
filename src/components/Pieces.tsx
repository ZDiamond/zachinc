"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PIECE_STATUSES, type Angle, type Piece } from "@/lib/voice";
import { formatShort } from "@/lib/dates";

/**
 * Pieces, and the two questions asked of each one after it ships.
 *
 * Not likes. Whether you wanted to write the next one, which predicts lasting a
 * year, and whether it created pull, which is the only reputation signal that
 * has ever mattered here.
 */
export default function Pieces({
  userId,
  today,
  initial,
  angles,
}: {
  userId: string;
  today: string;
  initial: Piece[];
  angles: Angle[];
}) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState({ title: "", angle_id: angles[0]?.id ?? "" });
  const sb = supabaseBrowser();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    setDraft({ ...draft, title: "" });
    const { data } = await sb
      .from("pieces")
      .insert({ user_id: userId, title, angle_id: draft.angle_id || null })
      .select()
      .single();
    if (data) setRows((p) => [...p, data as Piece]);
  }

  async function patch(id: string, changes: Partial<Piece>) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...changes } : r)));
    await sb.from("pieces").update(changes).eq("id", id);
  }

  async function remove(id: string) {
    setRows((p) => p.filter((r) => r.id !== id));
    await sb.from("pieces").delete().eq("id", id);
  }

  /** Marking a piece shipped stamps the date, since that is always today. */
  async function setStatus(p: Piece, status: string) {
    const changes: Partial<Piece> = { status };
    if (status === "shipped" && !p.shipped_on) changes.shipped_on = today;
    await patch(p.id, changes);
  }

  function tri(value: boolean | null, onSet: (v: boolean | null) => void) {
    return (
      <span className="yn">
        <button aria-pressed={value === true} onClick={() => onSet(value === true ? null : true)}>
          Yes
        </button>
        <button
          className="no"
          aria-pressed={value === false}
          onClick={() => onSet(value === false ? null : false)}
        >
          No
        </button>
      </span>
    );
  }

  const shipped = rows.filter((r) => r.status === "shipped").length;

  return (
    <>
      <div className="sec-h">
        <h2>Pieces</h2>
        <span className="sec-note">{shipped} shipped</span>
      </div>

      {rows.length > 0 ? (
        <div>
          {rows.map((p) => {
            const angle = angles.find((a) => a.id === p.angle_id);
            const isShipped = p.status === "shipped";
            return (
              <div className="piece" key={p.id}>
                <div className="piece-head">
                  <span className="piece-title">{p.title}</span>
                  {angle ? <span className="piece-angle">{angle.name}</span> : null}
                  <span className="piece-when">
                    {p.shipped_on ? formatShort(p.shipped_on) : ""}
                  </span>
                </div>

                <div className="add-row" style={{ marginTop: 10, flexWrap: "wrap" }}>
                  <select
                    value={p.status}
                    onChange={(e) => setStatus(p, e.target.value)}
                    aria-label="Status"
                    style={selectStyle}
                  >
                    {PIECE_STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>{s.name}</option>
                    ))}
                  </select>
                  <select
                    value={p.angle_id ?? ""}
                    onChange={(e) => patch(p.id, { angle_id: e.target.value || null })}
                    aria-label="Angle"
                    style={selectStyle}
                  >
                    <option value="">No angle</option>
                    {angles.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    defaultValue={p.url}
                    placeholder="Link"
                    onBlur={(e) => patch(p.id, { url: e.target.value })}
                  />
                  <button className="t-del" onClick={() => remove(p.id)} aria-label="Delete">
                    &times;
                  </button>
                </div>

                {isShipped ? (
                  <>
                    <div className="piece-scores">
                      <span className="score-q">
                        <span className="q">Did you want to write the next one immediately?</span>
                        {tri(p.wanted_next, (v) => patch(p.id, { wanted_next: v }))}
                      </span>
                      <span className="score-q">
                        <span className="q">Did it create a conversation, an intro, or inbound?</span>
                        {tri(p.created_pull, (v) => patch(p.id, { created_pull: v }))}
                      </span>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <input
                        type="text"
                        defaultValue={p.response_notes}
                        placeholder="Who responded, what they disagreed with, what it opened"
                        onBlur={(e) => patch(p.id, { response_notes: e.target.value })}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <form className="add-row" onSubmit={add}>
        <input
          type="text"
          value={draft.title}
          placeholder="Working title"
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <select
          value={draft.angle_id}
          onChange={(e) => setDraft({ ...draft, angle_id: e.target.value })}
          aria-label="Angle"
          style={selectStyle}
        >
          <option value="">No angle</option>
          {angles.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <button className="btn ghost small" type="submit" disabled={!draft.title.trim()}>
          Add
        </button>
      </form>
    </>
  );
}

const selectStyle: React.CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 12,
  padding: "8px 9px",
  background: "var(--paper)",
  border: "1px solid var(--line)",
  borderRadius: 3,
  color: "var(--ink)",
};
