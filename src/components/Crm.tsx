"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  LANES,
  STATUSES,
  CURRENCY_OPTIONS,
  LIVE_STATUSES,
  flagFor,
  daysQuiet,
  laneName,
  AGING_DAYS,
  FLAG_LABEL,
  type Opportunity,
} from "@/lib/crm";
import { formatShort } from "@/lib/dates";

type Filter = "attention" | "all" | string;

export default function Crm({
  userId,
  today,
  initial,
}: {
  userId: string;
  today: string;
  initial: Opportunity[];
}) {
  const [rows, setRows] = useState<Opportunity[]>(initial);
  const [filter, setFilter] = useState<Filter>("attention");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", org: "", lane: "network" });
  const [busy, setBusy] = useState(false);

  const sb = supabaseBrowser();

  const decorated = useMemo(
    () =>
      rows.map((o) => ({
        o,
        flag: flagFor(o, today),
        quiet: daysQuiet(o, today),
      })),
    [rows, today]
  );

  const attention = decorated.filter(
    (d) => d.flag !== null || (LIVE_STATUSES.includes(d.o.status) && (d.quiet ?? 0) >= AGING_DAYS)
  );

  const shown = useMemo(() => {
    let list = decorated;
    if (filter === "attention") list = attention;
    else if (filter !== "all") list = decorated.filter((d) => d.o.lane === filter);

    return [...list].sort((a, b) => {
      // Anything wrong floats up, then by soonest next step.
      const rank = (f: string | null) =>
        f === "no_next_step" ? 0 : f === "overdue" ? 1 : f === "no_date" ? 2 : 3;
      const r = rank(a.flag) - rank(b.flag);
      if (r !== 0) return r;
      const ad = a.o.next_step_on ?? "9999";
      const bd = b.o.next_step_on ?? "9999";
      if (ad !== bd) return ad < bd ? -1 : 1;
      return a.o.name.localeCompare(b.o.name);
    });
  }, [decorated, filter, attention]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name || busy) return;
    setBusy(true);
    const { data, error } = await sb
      .from("opportunities")
      .insert({ user_id: userId, name, org: draft.org.trim(), lane: draft.lane })
      .select()
      .single();
    if (!error && data) {
      setRows((p) => [...p, data as Opportunity]);
      setOpenId((data as Opportunity).id);
      setFilter("all");
    }
    setDraft({ name: "", org: "", lane: draft.lane });
    setBusy(false);
  }

  async function patch(id: string, changes: Partial<Opportunity>) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...changes } : r)));
    await sb.from("opportunities").update(changes).eq("id", id);
  }

  async function remove(id: string) {
    setRows((p) => p.filter((r) => r.id !== id));
    await sb.from("opportunities").delete().eq("id", id);
  }

  /** Logging contact is the single most common action, so it is one click. */
  async function logContact(id: string) {
    await patch(id, { last_contact_on: today });
  }

  const laneCounts = LANES.map((l) => ({
    ...l,
    n: rows.filter((r) => r.lane === l.key).length,
  }));

  return (
    <>
      <div className="sec-h">
        <h2>Pipeline</h2>
        <span className="sec-note">
          {rows.length} record{rows.length === 1 ? "" : "s"}
          {attention.length ? ` - ${attention.length} need attention` : ""}
        </span>
      </div>

      <div className="crm-filters">
        <button
          className="chip"
          aria-pressed={filter === "attention"}
          onClick={() => setFilter("attention")}
        >
          Needs attention<span className="chip-n">{attention.length}</span>
        </button>
        <button className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          All<span className="chip-n">{rows.length}</span>
        </button>
        {laneCounts.map((l) => (
          <button
            key={l.key}
            className="chip"
            aria-pressed={filter === l.key}
            onClick={() => setFilter(l.key)}
          >
            {l.name}<span className="chip-n">{l.n}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="crm-empty">
          {filter === "attention" && rows.length > 0
            ? "Nothing is drifting. Every live opportunity has a dated next step."
            : "Nothing here yet. Add the first person below."}
        </p>
      ) : (
        <div>
          {shown.map(({ o, flag, quiet }) => {
            const isOpen = openId === o.id;
            const late = flag === "overdue";
            return (
              <div
                className={`opp ${flag || (quiet ?? 0) >= AGING_DAYS ? "flagged" : ""} ${isOpen ? "open" : ""}`}
                key={o.id}
              >
                <button className="opp-head" onClick={() => setOpenId(isOpen ? null : o.id)}>
                  <span className="opp-name">{o.name}</span>
                  {o.org ? <span className="opp-org">{o.org}</span> : null}
                  <span className="opp-lane">{laneName(o.lane)}</span>
                  <span className={`opp-next ${o.next_step ? "" : "empty"}`}>
                    {o.next_step || o.value || ""}
                  </span>
                  <span className={`opp-when ${late ? "late" : ""}`}>
                    {flag === "overdue" && o.next_step_on
                      ? `overdue ${formatShort(o.next_step_on)}`
                      : flag
                        ? FLAG_LABEL[flag]
                        : o.next_step_on
                          ? formatShort(o.next_step_on)
                          : quiet !== null && quiet >= AGING_DAYS
                            ? `quiet ${quiet}d`
                            : ""}
                  </span>
                </button>

                {isOpen ? (
                  <div className="opp-body">
                    <div className="opp-field" style={{ marginTop: 12 }}>
                      <label htmlFor={`ns_${o.id}`}>Next step</label>
                      <input
                        id={`ns_${o.id}`}
                        type="text"
                        defaultValue={o.next_step}
                        placeholder="One concrete action. An intro, a proposal, a date, or a clear no."
                        onBlur={(e) => patch(o.id, { next_step: e.target.value })}
                      />
                    </div>

                    <div className="opp-grid">
                      <div className="opp-field">
                        <label htmlFor={`nso_${o.id}`}>Next step by</label>
                        <input
                          id={`nso_${o.id}`}
                          type="date"
                          defaultValue={o.next_step_on ?? ""}
                          onChange={(e) => patch(o.id, { next_step_on: e.target.value || null })}
                        />
                      </div>
                      <div className="opp-field">
                        <label htmlFor={`lc_${o.id}`}>Last contact</label>
                        <input
                          id={`lc_${o.id}`}
                          type="date"
                          defaultValue={o.last_contact_on ?? ""}
                          onChange={(e) => patch(o.id, { last_contact_on: e.target.value || null })}
                        />
                      </div>
                      <div className="opp-field">
                        <label htmlFor={`st_${o.id}`}>Status</label>
                        <select
                          id={`st_${o.id}`}
                          defaultValue={o.status}
                          onChange={(e) => patch(o.id, { status: e.target.value })}
                        >
                          {STATUSES.map((s) => (
                            <option key={s.key} value={s.key}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="opp-field">
                        <label htmlFor={`ln_${o.id}`}>Lane</label>
                        <select
                          id={`ln_${o.id}`}
                          defaultValue={o.lane}
                          onChange={(e) => patch(o.id, { lane: e.target.value })}
                        >
                          {LANES.map((l) => (
                            <option key={l.key} value={l.key}>{l.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="opp-field">
                        <label htmlFor={`cu_${o.id}`}>Moves which currency</label>
                        <select
                          id={`cu_${o.id}`}
                          defaultValue={o.currency}
                          onChange={(e) => patch(o.id, { currency: e.target.value })}
                        >
                          {CURRENCY_OPTIONS.map((c) => (
                            <option key={c.key} value={c.key}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="opp-field">
                        <label htmlFor={`ti_${o.id}`}>Tier</label>
                        <select
                          id={`ti_${o.id}`}
                          defaultValue={o.tier ?? ""}
                          onChange={(e) =>
                            patch(o.id, { tier: e.target.value ? Number(e.target.value) : null })
                          }
                        >
                          <option value="">-</option>
                          <option value="1">1 - go deep</option>
                          <option value="2">2 - keep moving</option>
                          <option value="3">3 - keep warm</option>
                        </select>
                      </div>
                      <div className="opp-field">
                        <label htmlFor={`sr_${o.id}`}>Relationship</label>
                        <select
                          id={`sr_${o.id}`}
                          defaultValue={o.strength ?? ""}
                          onChange={(e) =>
                            patch(o.id, { strength: e.target.value ? Number(e.target.value) : null })
                          }
                        >
                          <option value="">-</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div className="opp-field">
                        <label htmlFor={`en_${o.id}`}>Energy</label>
                        <select
                          id={`en_${o.id}`}
                          defaultValue={o.energy ?? ""}
                          onChange={(e) =>
                            patch(o.id, { energy: e.target.value ? Number(e.target.value) : null })
                          }
                        >
                          <option value="">-</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="opp-field" style={{ marginTop: 12 }}>
                      <label htmlFor={`va_${o.id}`}>What it could be worth</label>
                      <input
                        id={`va_${o.id}`}
                        type="text"
                        defaultValue={o.value}
                        placeholder="A number, a role, an intro, a proof point"
                        onBlur={(e) => patch(o.id, { value: e.target.value })}
                      />
                    </div>

                    <div className="opp-field" style={{ marginTop: 12 }}>
                      <label htmlFor={`no_${o.id}`}>Notes</label>
                      <textarea
                        id={`no_${o.id}`}
                        defaultValue={o.notes}
                        placeholder="What they need, what energized you, what they offered, who they can introduce."
                        onBlur={(e) => patch(o.id, { notes: e.target.value })}
                      />
                    </div>

                    <div className="opp-actions">
                      <button className="btn ghost small" onClick={() => logContact(o.id)}>
                        Talked today
                      </button>
                      <button
                        className="btn ghost small"
                        style={{ color: "var(--red)", borderColor: "var(--line)" }}
                        onClick={() => remove(o.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <form className="crm-add" onSubmit={add}>
        <input
          type="text"
          value={draft.name}
          placeholder="Name"
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <input
          type="text"
          value={draft.org}
          placeholder="Company (optional)"
          onChange={(e) => setDraft({ ...draft, org: e.target.value })}
        />
        <select
          value={draft.lane}
          onChange={(e) => setDraft({ ...draft, lane: e.target.value })}
          style={{
            fontFamily: "var(--mono)", fontSize: 12, padding: "8px 10px",
            background: "var(--card)", border: "1px solid var(--line)",
            borderRadius: 3, color: "var(--ink)",
          }}
        >
          {LANES.map((l) => (
            <option key={l.key} value={l.key}>{l.name}</option>
          ))}
        </select>
        <button className="btn ghost small" type="submit" disabled={busy || !draft.name.trim()}>
          Add
        </button>
      </form>
    </>
  );
}
