/**
 * Training program. Ported from 4daycutprogram.md.
 *
 * The week has a fixed shape but real life drifts (a lift lands on Sunday, a
 * session gets skipped). So the board shows today's *default* session and the
 * week's *remaining* sessions, and lets Zach log whatever he actually did.
 * The point is to know what is left this week, not to enforce the calendar.
 */

export type Exercise = { name: string; sets: string };

export type Session = {
  key: string;
  name: string;
  kind: "lift" | "movement" | "rest";
  minutes: string;
  goal?: string;
  exercises: Exercise[];
  cues?: string[];
};

export const SESSIONS: Record<string, Session> = {
  upper_a: {
    key: "upper_a",
    name: "Upper A",
    kind: "lift",
    minutes: "45-55 min",
    goal: "Maintain upper-body strength and shoulder/back width while cutting.",
    exercises: [
      { name: "Incline DB Press", sets: "3 x 6-10" },
      { name: "Chest-Supported T-Bar Row", sets: "3 x 6-10" },
      { name: "Lat Pulldown", sets: "3 x 8-12" },
      { name: "Cable Lateral Raise", sets: "3 x 12-15" },
      { name: "Triceps Pushdown", sets: "2 x 10-15" },
      { name: "DB Curl", sets: "2 x 8-12" },
    ],
    cues: ["Time saver: superset lateral raises with triceps. Pair curls wherever convenient."],
  },
  lower_a: {
    key: "lower_a",
    name: "Lower A: Posterior Chain",
    kind: "lift",
    minutes: "50-60 min",
    goal: "The main glute and hamstring day.",
    exercises: [
      { name: "Romanian Deadlift", sets: "3 x 6-10" },
      { name: "DB Reverse Lunge", sets: "3 x 8-10 / leg" },
      { name: "Seated or Lying Leg Curl", sets: "3 x 8-12" },
      { name: "Donkey Kick Machine", sets: "3 x 10-15 / leg" },
      { name: "Calf Raise", sets: "2 x 10-15" },
    ],
    cues: [
      "RDL: ribs stacked over pelvis. Stop the descent before extra range comes from arching the lower back.",
      "Reverse lunge: slightly longer stride, modest forward torso lean, front leg does most of the work.",
      "Donkey kick: brace abs, pelvis square, stop before the lower back extends.",
    ],
  },
  upper_b: {
    key: "upper_b",
    name: "Upper B",
    kind: "lift",
    minutes: "45-55 min",
    goal: "Seated pressing: back support makes it easier to avoid rib flare and lower-back arching.",
    exercises: [
      { name: "Seated DB Shoulder Press", sets: "3 x 6-10" },
      { name: "Seated Cable Row", sets: "3 x 8-12" },
      { name: "Pull-Up or Lat Pulldown", sets: "3 x 6-10" },
      { name: "Cable Lateral Raise", sets: "3 x 12-15" },
      { name: "Reverse Curl", sets: "2 x 10-15" },
      { name: "Triceps Pushdown", sets: "2 x 10-15" },
    ],
  },
  lower_b: {
    key: "lower_b",
    name: "Lower B: Squat + Glutes",
    kind: "lift",
    minutes: "50-60 min",
    exercises: [
      { name: "Heel-Elevated ATG Smith Squat", sets: "3 x 6-10" },
      { name: "Single-Leg Glute-Biased Leg Press", sets: "3 x 8-12 / leg" },
      { name: "Lying or Seated Leg Curl", sets: "3 x 10-15" },
      { name: "Donkey Kick Machine", sets: "2 x 12-15 / leg" },
      { name: "Calf Raise", sets: "2 x 10-15" },
    ],
    cues: [
      "Smith squat: heels elevated, knees over toes, deep ROM, big quad stretch, controlled eccentric. Do not snap the knees back at lockout.",
      "Single-leg leg press: foot high on the platform, deep ROM, pelvis and lower back against the pad, push through the whole foot.",
    ],
  },
  movement: {
    key: "movement",
    name: "Movement Session",
    kind: "movement",
    minutes: "10-15 min",
    goal: "Plus an optional 20-30 minute Zone 2 session. Brisk incline treadmill walking is a good option.",
    exercises: [
      { name: "90/90 Wall Breathing", sets: "2 x 5 slow breaths" },
      { name: "Dead Bug", sets: "2 x 6 / side" },
      { name: "Glute Bridge", sets: "2 x 10" },
      { name: "Bird Dog", sets: "2 x 6 / side" },
      { name: "Couch Stretch", sets: "45 sec / side" },
    ],
  },
  rest: {
    key: "rest",
    name: "Rest / Walking",
    kind: "rest",
    minutes: "",
    exercises: [],
  },
};

/** Default session by JS getDay(). Sun=0..Sat=6. */
export const DEFAULT_BY_DOW: Record<number, string> = {
  0: "rest",
  1: "upper_a",
  2: "lower_a",
  3: "movement",
  4: "upper_b",
  5: "lower_b",
  6: "movement",
};

/** What a complete training week looks like. Used to show what is still owed. */
export const WEEKLY_REQUIREMENT = {
  lifts: ["upper_a", "lower_a", "upper_b", "lower_b"],
  movement: 2,
  zone2: 2,
  stepsPerDay: "8-10k",
};

export const TRAINING_RULES = [
  "Compounds: 1-2 reps in reserve. Isolation: 0-2 reps in reserve.",
  "Big exercises: 2-3 minutes rest. Accessories: 60-90 seconds.",
  "Do not turn lifting into cardio with very short rest or endless circuits.",
  "Maintaining strength through the cut is the win. PRs are not the goal.",
  "Do not add cardio unless fat loss has genuinely stalled for about two weeks.",
];

export const PRIORITY_ORDER = [
  "Calorie deficit",
  "High protein",
  "Four days of hard lifting",
  "Daily walking",
  "Sleep",
  "A little Zone 2 cardio",
  "Everything else",
];

export function defaultSessionFor(dow: number): Session {
  return SESSIONS[DEFAULT_BY_DOW[dow]] ?? SESSIONS.rest;
}

/** Lifts still owed this week, given what has already been logged. */
export function liftsRemaining(completedKeys: string[]): Session[] {
  const done = new Set(completedKeys);
  return WEEKLY_REQUIREMENT.lifts.filter((k) => !done.has(k)).map((k) => SESSIONS[k]);
}
