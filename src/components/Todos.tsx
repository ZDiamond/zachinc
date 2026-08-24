"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { daysBetween } from "@/lib/dates";

export type Todo = {
  id: string;
  title: string;
  done: boolean;
  added_on: string;
  sort: number;
};

/**
 * Maintenance to-dos.
 *
 * Deliberately its own lane, separate from the three outcomes: signing a
 * document or chasing a form is real work that has to happen, but it is not
 * progress against the 90 days and should never be able to look like it.
 * An open item carries forward until it is checked off.
 */
export default function Todos({
  userId,
  today,
  initial,
}: {
  userId: string;
  today: string;
  initial: Todo[];
}) {
  const [todos, setTodos] = useState<Todo[]>(initial);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title || busy) return;
    setBusy(true);
    setDraft("");
    const sort = todos.length ? Math.max(...todos.map((t) => t.sort)) + 1 : 0;
    const { data, error } = await supabaseBrowser()
      .from("todos")
      .insert({ user_id: userId, title, added_on: today, sort })
      .select()
      .single();
    if (!error && data) setTodos((prev) => [...prev, data as Todo]);
    setBusy(false);
  }

  async function toggle(t: Todo) {
    const done = !t.done;
    setTodos((prev) => prev.map((x) => (x.id === t.id ? { ...x, done } : x)));
    await supabaseBrowser()
      .from("todos")
      .update({ done, done_at: done ? new Date().toISOString() : null })
      .eq("id", t.id);
  }

  async function remove(t: Todo) {
    setTodos((prev) => prev.filter((x) => x.id !== t.id));
    await supabaseBrowser().from("todos").delete().eq("id", t.id);
  }

  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  const stale = open.filter((t) => daysBetween(t.added_on, today) >= 7).length;

  return (
    <>
      <div className="sec-h">
        <h2>To-do</h2>
        <span className="sec-note">
          {open.length} open{stale ? ` - ${stale} over a week old` : ""}
        </span>
      </div>
      <div className="todo-lane">
        {open.length === 0 && done.length === 0 ? (
          <p className="sec-note" style={{ textAlign: "left", padding: "12px 0" }}>
            Nothing here. Add the admin that has to happen but is not the plan.
          </p>
        ) : null}

        {open.map((t) => {
          const age = daysBetween(t.added_on, today);
          return (
            <div className="todo" key={t.id}>
              <input type="checkbox" checked={false} onChange={() => toggle(t)} />
              <span className="t-title">{t.title}</span>
              {age >= 3 ? <span className="t-age">{age}d</span> : null}
              <button className="t-del" onClick={() => remove(t)} aria-label={`Delete ${t.title}`}>
                &times;
              </button>
            </div>
          );
        })}

        {done.map((t) => (
          <div className="todo done" key={t.id}>
            <input type="checkbox" checked onChange={() => toggle(t)} />
            <span className="t-title">{t.title}</span>
            <button className="t-del" onClick={() => remove(t)} aria-label={`Delete ${t.title}`}>
              &times;
            </button>
          </div>
        ))}

        <form className="todo-add" onSubmit={add}>
          <input
            type="text"
            value={draft}
            placeholder="Add something that has to get done"
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
