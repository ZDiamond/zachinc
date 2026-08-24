"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "./supabase/client";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Debounced writes.
 *
 * The board is typed into all day, so every keystroke must not hit the network.
 * Changes are coalesced and flushed shortly after typing stops, and again on
 * unload so a closed tab does not lose the last sentence.
 */
export function useDebouncedSave<T>(
  save: (value: T) => Promise<unknown>,
  delay = 700
): [SaveState, (value: T) => void, () => void] {
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<T | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useRef(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current === null) return;
    const value = pending.current;
    pending.current = null;
    setState("saving");
    saveRef
      .current(value)
      .then(() => setState("saved"))
      .catch(() => setState("error"));
  });

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush.current();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush.current);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush.current);
      flush.current();
    };
  }, []);

  const schedule = (value: T) => {
    pending.current = value;
    setState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flush.current(), delay);
  };

  return [state, schedule, () => flush.current()];
}

/** Upsert a patch onto today's `days` row. */
export async function saveDay(userId: string, date: string, patch: Record<string, unknown>) {
  const { error } = await supabaseBrowser()
    .from("days")
    .upsert({ user_id: userId, date, ...patch }, { onConflict: "user_id,date" });
  if (error) throw error;
}

/** Upsert a patch onto this week's `weeks` row. */
export async function saveWeek(
  userId: string,
  weekStart: string,
  weekN: number | null,
  patch: Record<string, unknown>
) {
  const { error } = await supabaseBrowser()
    .from("weeks")
    .upsert(
      { user_id: userId, week_start: weekStart, week_n: weekN, ...patch },
      { onConflict: "user_id,week_start" }
    );
  if (error) throw error;
}
