"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  CONDITIONS,
  KINDS,
  readOf,
  ownershipRead,
  type Assessment,
} from "@/lib/substance";

/**
 * Applying the filter.
 *
 * Each condition is a yes, a no, or unjudged, and unjudged is kept distinct
 * from no on purpose: "I have not looked" and "I looked and it is not there"
 * are different findings, and collapsing them is how a screen turns into a
 * rubber stamp.
 */
export default function Substance({
  userId,
  initial,
}: {
  userId: string;
  initial: Assessment[];
}) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState({ subject: "", kind: "business" });
  const sb = supabaseBrowser();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const subject = draft.subject.trim();
    if (!subject) return;
    setDraft({ ...draft, subject: "" });
    const { data } = await sb
      .from("substance_assessments")
      .insert({ user_id: userId, subject, kind: draft.kind })
      .select()
      .single();
    if (data) setRows((p) => [...p, data as Assessment]);
  }

  async function patch(id: string, changes: Partial<Assessment>) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...changes } : r)));
    await sb.from("substance_assessments").update(changes).eq("id", id);
  }

  async function remove(id: string) {
    setRows((p) => p.filter((r) => r.id !== id));
    await sb.from("substance_assessments").delete().eq("id", id);
  }

  return (
    <>
      <div className="sec-h">
        <h2>Subjects</h2>
        <span className="sec-note">{rows.length} assessed</span>
      </div>

      {rows.map((a) => {
        const read = readOf(a);
        const own = ownershipRead(a);
        const isRole = a.kind === "role";
        return (
          <div className={`assess ${read.tone === "none" ? "scaffolding" : read.tone}`} key={a.id}>
            <div className="assess-head">
              <span className="assess-subject">{a.subject}</span>
              <span className="assess-kind">{KINDS.find((k) => k.key === a.kind)?.name}</span>
              <span className={`assess-read ${read.tone}`}>{read.label}</span>
            </div>
            <p className="assess-detail">{read.detail}</p>

            {CONDITIONS.map((c) => {
              const value = a[c.key] as boolean | null;
              const note = a[`${c.key}_note` as keyof Assessment] as string;
              return (
                <div className="cond" key={c.key}>
                  <div className="cond-head">
                    <span
                      className={`cond-name ${value === true ? "yes" : value === false ? "no" : ""}`}
                    >
                      {c.name}
                    </span>
                    <span className="cond-yn yn">
                      <button
                        aria-pressed={value === true}
                        onClick={() => patch(a.id, { [c.key]: value === true ? null : true })}
                      >
                        Yes
                      </button>
                      <button
                        className="no"
                        aria-pressed={value === false}
                        onClick={() => patch(a.id, { [c.key]: value === false ? null : false })}
                      >
                        No
                      </button>
                    </span>
                  </div>
                  <p className="cond-test">{isRole ? c.roleTest : c.test}</p>
                  <input
                    type="text"
                    defaultValue={note}
                    placeholder="Why. Be specific."
                    onBlur={(e) => patch(a.id, { [`${c.key}_note`]: e.target.value })}
                  />
                </div>
              );
            })}

            <div style={{ marginTop: 14 }}>
              <label className="cond-name" style={{ display: "block", marginBottom: 6 }}>
                The compressible layer
              </label>
              <p className="cond-test">
                Where do skilled people here lose time to quoting, scheduling, follow-up,
                documentation, or coordination? This is the half that automates.
              </p>
              <input
                type="text"
                defaultValue={a.scaffolding}
                placeholder="What the admin layer actually costs them"
                onBlur={(e) => patch(a.id, { scaffolding: e.target.value })}
              />
            </div>

            {own ? <p className="own-read">{own}</p> : null}

            <div className="opp-actions">
              <input
                type="text"
                defaultValue={a.verdict}
                placeholder="Verdict in your own words"
                onBlur={(e) => patch(a.id, { verdict: e.target.value })}
              />
              <button
                className="btn ghost small"
                style={{ color: "var(--red)" }}
                onClick={() => remove(a.id)}
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}

      <form className="add-row" onSubmit={add}>
        <input
          type="text"
          value={draft.subject}
          placeholder="A business, a role, or a bet"
          onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
        />
        <select
          value={draft.kind}
          onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
          aria-label="Kind"
          style={{
            fontFamily: "var(--mono)", fontSize: 12, padding: "8px 9px",
            background: "var(--paper)", border: "1px solid var(--line)",
            borderRadius: 3, color: "var(--ink)",
          }}
        >
          {KINDS.map((k) => (
            <option key={k.key} value={k.key}>{k.name}</option>
          ))}
        </select>
        <button className="btn ghost small" type="submit" disabled={!draft.subject.trim()}>
          Assess
        </button>
      </form>
    </>
  );
}
