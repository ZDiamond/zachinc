import { buildDay, fmtTime, MIN, freeGaps, mergeIntervals } from "../src/lib/day.ts";
import { defaultSessionFor } from "../src/lib/workout.ts";

function show(label: string, plan: ReturnType<typeof buildDay>) {
  console.log("\n=== " + label + " ===");
  for (const b of plan.blocks) {
    const flag = b.squeezed ? "  [squeezed]" : "";
    console.log(
      `${fmtTime(b.start).padStart(8)} - ${fmtTime(b.end).padEnd(8)} ${b.kind.padEnd(8)} ${b.name}${flag}`
    );
  }
  console.log("notes:", plan.notes.length ? plan.notes : "(none)");
  console.log(`deepWork=${plan.deepWorkMinutes}m meetings=${plan.meetingMinutes}m ends=${fmtTime(plan.endsAt)}`);
  if (plan.dropped.length) console.log("dropped:", plan.dropped.map((d) => d.name));
}

// Sanity on the interval helpers first.
console.log("merge:", JSON.stringify(mergeIntervals([{start:10,end:20},{start:18,end:30},{start:50,end:60}])));
console.log("gaps:", JSON.stringify(freeGaps(0, 100, [{start:20,end:30},{start:60,end:70}])));

// Monday, no meetings at all.
show("Mon, empty calendar (Upper A)", buildDay({ dow: 1, events: [], session: defaultSessionFor(1) }));

// Tuesday, heavy conversation day. Three stacked meetings.
show(
  "Tue, 3 meetings (Lower A)",
  buildDay({
    dow: 2,
    events: [
      { id: "1", title: "Davis intro call", start: MIN(12, 30), end: MIN(13, 0) },
      { id: "2", title: "Becky / GTM sprint pitch", start: MIN(13, 0), end: MIN(14, 0) },
      { id: "3", title: "Roadrunner - Joubin", start: MIN(16, 0), end: MIN(17, 0) },
    ],
    session: defaultSessionFor(2),
  })
);

// Meeting that collides with the workout slot.
show(
  "Wed, 8am collision (Movement)",
  buildDay({
    dow: 3,
    events: [{ id: "1", title: "Early founder call", start: MIN(7, 30), end: MIN(8, 30) }],
    session: defaultSessionFor(3),
  })
);

// Friday, ship + weekly review, with an afternoon eaten.
show(
  "Fri, meetings 1-4pm (Lower B)",
  buildDay({
    dow: 5,
    events: [{ id: "1", title: "Client working session", start: MIN(13, 0), end: MIN(16, 0) }],
    session: defaultSessionFor(5),
  })
);

// Pathological: calendar almost entirely booked.
show(
  "Thu, wall-to-wall",
  buildDay({
    dow: 4,
    events: [
      { id: "1", title: "A", start: MIN(8, 0), end: MIN(11, 0) },
      { id: "2", title: "B", start: MIN(11, 15), end: MIN(14, 0) },
      { id: "3", title: "C", start: MIN(14, 15), end: MIN(18, 0) },
    ],
    session: defaultSessionFor(4),
  })
);
