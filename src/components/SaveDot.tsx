"use client";

import type { SaveState } from "@/lib/persist";

/** Quiet save indicator. Only speaks up when something did not save. */
export default function SaveDot({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const label = state === "saving" ? "saving" : state === "saved" ? "saved" : "not saved";
  return (
    <span className="sec-note" style={{ color: state === "error" ? "var(--red)" : "var(--muted)" }}>
      {label}
    </span>
  );
}
