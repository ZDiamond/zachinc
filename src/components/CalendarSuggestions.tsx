"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LANES } from "@/lib/crm";
import { orgFromEmail, type NewPersonSuggestion, type ContactUpdate } from "@/lib/suggestions";
import { formatShort } from "@/lib/dates";

/**
 * People from the calendar, offered rather than inserted.
 *
 * A calendar carries contractors, dentists and recurring internal blocks.
 * Creating records for those automatically would bury the pipeline in noise and
 * teach Zach to ignore the attention list, so every addition is one deliberate
 * click, and a dismissal is permanent.
 */
export default function CalendarSuggestions({
  userId,
  newPeople,
  contactUpdates,
  error,
}: {
  userId: string;
  newPeople: NewPersonSuggestion[];
  contactUpdates: ContactUpdate[];
  error: string | null;
}) {
  const [people, setPeople] = useState(newPeople);
  const [updates, setUpdates] = useState(contactUpdates);
  const [lanes, setLanes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const sb = supabaseBrowser();

  async function add(p: NewPersonSuggestion) {
    setBusy(p.email);
    const { error: err } = await sb.from("opportunities").insert({
      user_id: userId,
      name: p.name,
      email: p.email,
      org: orgFromEmail(p.email),
      lane: lanes[p.email] ?? "network",
      status: "new",
      last_contact_on: p.lastMeeting.date,
      notes: `Met ${formatShort(p.lastMeeting.date)}: ${p.lastMeeting.title}`,
    });
    if (!err) setPeople((prev) => prev.filter((x) => x.email !== p.email));
    setBusy(null);
  }

  async function dismiss(p: NewPersonSuggestion) {
    setBusy(p.email);
    const { error: err } = await sb
      .from("ignored_contacts")
      .upsert({ user_id: userId, email: p.email, name: p.name }, { onConflict: "user_id,email" });
    if (!err) setPeople((prev) => prev.filter((x) => x.email !== p.email));
    setBusy(null);
  }

  async function logContact(u: ContactUpdate) {
    setBusy(u.opportunity.id);
    const { error: err } = await sb
      .from("opportunities")
      .update({ last_contact_on: u.metOn })
      .eq("id", u.opportunity.id);
    if (!err) setUpdates((prev) => prev.filter((x) => x.opportunity.id !== u.opportunity.id));
    setBusy(null);
  }

  if (error) {
    return (
      <div className="notes">
        <p>
          Cannot read the calendar for suggestions
          {error.startsWith("missing_env:") ? " (not configured)" : ` (${error})`}.
        </p>
      </div>
    );
  }

  if (people.length === 0 && updates.length === 0) return null;

  const shown = people.slice(0, 12);

  return (
    <>
      <div className="sec-h">
        <h2>From your calendar</h2>
        <span className="sec-note">
          {updates.length ? `${updates.length} to log` : ""}
          {updates.length && people.length ? " - " : ""}
          {people.length ? `${people.length} not in the CRM` : ""}
        </span>
      </div>

      <div className="sugg">
        {updates.map((u) => (
          <div className="sugg-row" key={u.opportunity.id}>
            <div className="sugg-who">
              <div className="sugg-name">{u.opportunity.name}</div>
            </div>
            <div className="sugg-why">
              Met <b>{formatShort(u.metOn)}</b> ({u.title}). Last contact on record:{" "}
              {u.opportunity.last_contact_on ? formatShort(u.opportunity.last_contact_on) : "never"}.
            </div>
            <div className="sugg-actions">
              <button
                className="btn ghost small"
                disabled={busy === u.opportunity.id}
                onClick={() => logContact(u)}
              >
                Log it
              </button>
            </div>
          </div>
        ))}

        {shown.map((p) => (
          <div className="sugg-row" key={p.email}>
            <div className="sugg-who">
              <div className="sugg-name">{p.name}</div>
              <div className="sugg-email">{p.email}</div>
            </div>
            <div className="sugg-why">
              <b>{p.lastMeeting.title}</b>, {formatShort(p.lastMeeting.date)}
              {p.count > 1 ? ` and ${p.count - 1} other meeting${p.count > 2 ? "s" : ""}` : ""}
            </div>
            <div className="sugg-actions">
              <select
                value={lanes[p.email] ?? "network"}
                onChange={(e) => setLanes({ ...lanes, [p.email]: e.target.value })}
                aria-label={`Lane for ${p.name}`}
              >
                {LANES.map((l) => (
                  <option key={l.key} value={l.key}>{l.name}</option>
                ))}
              </select>
              <button className="btn ghost small" disabled={busy === p.email} onClick={() => add(p)}>
                Add
              </button>
              <button
                className="btn ghost small"
                disabled={busy === p.email}
                onClick={() => dismiss(p)}
                title="Never suggest this person again"
              >
                Not relevant
              </button>
            </div>
          </div>
        ))}

        {people.length > shown.length ? (
          <p className="sugg-more">
            {people.length - shown.length} more further back. Handle these and they will appear.
          </p>
        ) : null}
      </div>
    </>
  );
}
