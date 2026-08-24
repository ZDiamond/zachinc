"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useDebouncedSave } from "@/lib/persist";
import SaveDot from "./SaveDot";
import type { Lane } from "@/lib/plan";

type LaneState = { score?: number; decision?: string; note?: string };

const DECISIONS = ["", "Keep", "Pause", "Kill"];

/**
 * The lane scorecard and the board memo.
 *
 * Everything above this on the page is assembled from what was logged. This is
 * the part that still has to be judged by hand, which is the point: the data
 * removes the excuse to guess, it does not make the decision.
 */
export default function ReviewNotes({
  userId,
  checkpointDay,
  lanes,
  initialLanes,
  initialMemo,
}: {
  userId: string;
  checkpointDay: number;
  lanes: Lane[];
  initialLanes?: Record<string, LaneState>;
  initialMemo?: string;
}) {
  const [state, setState] = useState<Record<string, LaneState>>(initialLanes ?? {});
  const [memo, setMemo] = useState(initialMemo ?? "");

  const [save, schedule] = useDebouncedSave<{ lanes: Record<string, LaneState>; memo: string }>(
    async (v) => {
      const { error } = await supabaseBrowser()
        .from("reviews")
        .upsert(
          { user_id: userId, checkpoint_day: checkpointDay, lanes: v.lanes, memo: v.memo },
          { onConflict: "user_id,checkpoint_day" }
        );
      if (error) throw error;
    }
  );

  function update(key: string, patch: LaneState) {
    const next = { ...state, [key]: { ...state[key], ...patch } };
    setState(next);
    schedule({ lanes: next, memo });
  }

  function updateMemo(value: string) {
    setMemo(value);
    schedule({ lanes: state, memo: value });
  }

  return (
    <>
      <div style={{ textAlign: "right", marginBottom: 8 }}>
        <SaveDot state={save} />
      </div>

      <div className="blocks">
        {lanes.map((lane) => {
          const s = state[lane.key] ?? {};
          return (
            <div className="blk" key={lane.key} style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
              <span className="b-name" style={{ width: 170 }}>
                {lane.name}
              </span>
              <span className="b-what" style={{ flex: 1, minWidth: 200 }}>
                {lane.evidence}
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flex: "0 0 auto" }}>
                <select
                  value={s.score ?? ""}
                  onChange={(e) =>
                    update(lane.key, { score: e.target.value ? Number(e.target.value) : undefined })
                  }
                  aria-label={`${lane.name} score`}
                  style={selectStyle}
                >
                  <option value="">-</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <select
                  value={s.decision ?? ""}
                  onChange={(e) => update(lane.key, { decision: e.target.value })}
                  aria-label={`${lane.name} decision`}
                  style={selectStyle}
                >
                  {DECISIONS.map((d) => (
                    <option key={d} value={d}>
                      {d || "decide"}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={s.note ?? ""}
                placeholder="What is the evidence?"
                onChange={(e) => update(lane.key, { note: e.target.value })}
                style={{ marginTop: 8 }}
              />
            </div>
          );
        })}
      </div>

      <div className="proof-field" style={{ marginTop: 20 }}>
        <label htmlFor="memo">Board memo</label>
        <div className="hint">
          What worked, what did not, where the pull is, what you are stopping, the primary lane, the
          hedge, and the exact outcomes for the next period.
        </div>
        <textarea
          id="memo"
          value={memo}
          style={{ minHeight: 220 }}
          placeholder="Write it in your own words. One page is enough."
          onChange={(e) => updateMemo(e.target.value)}
        />
      </div>
    </>
  );
}

const selectStyle: React.CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 12,
  padding: "6px 8px",
  background: "var(--paper)",
  border: "1px solid var(--line)",
  borderRadius: 3,
  color: "var(--ink)",
};
