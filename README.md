# Zach Inc. Daily Operating Board

A private daily board for the 90-day window that starts Monday, August 24 2026.
It builds each day around whatever is actually on the Google Calendar, tracks
the plan's weekly quotas and the four optionality currencies, and keeps the
history so the Day 30 / 60 / 90 reviews assemble themselves.

The plan documents are the source of truth. Where a number here disagrees with
the 30-60-90 doc, the doc wins.

## Stack

- Next.js (App Router) on Vercel
- Supabase Postgres for state, Supabase Auth for Google sign-in
- Google Calendar API, read only

## How the day is built

`src/lib/day.ts` is the scheduler. It places anchors first (morning routine,
workout, lunch), drops the calendar's real meetings in as immovable, then fits
the work blocks into what is left, in priority order:

1. CEO open
2. Deep work I (or Ship, on Friday)
3. Outbound
4. Revenue
5. Deep work II (or the weekly CEO review, on Friday)
6. Career / explore

When the calendar is too full, the tail of that list is what gets dropped, and
the board says which blocks did not fit rather than quietly scheduling the
evening. There is no enforced hard stop.

The workout is an anchor, not filler. If a meeting lands on it, it moves
earlier, or later, but it does not disappear.

## Setup

### 1. Supabase

Project: `zachinc` (`dvfknmzpwddmgvbewmpj`, us-east-2). The schema in
`supabase/migrations/0001_init.sql` is already applied. It creates five tables
with RLS on all of them. `google_tokens` has no policies at all by design: only
the server's service-role key can read it, so a leaked anon key cannot reach
the calendar tokens. The linter flags that table as "RLS enabled, no policy",
which is the intended state.

Under **Authentication > Providers > Google**, enable Google and paste in the
client ID and secret from step 2.

### 2. Google Cloud

Create an OAuth 2.0 Client ID (type: Web application) at console.cloud.google.com:

- Enable the **Google Calendar API** for the project.
- Authorized redirect URI: `https://dvfknmzpwddmgvbewmpj.supabase.co/auth/v1/callback`
- On the OAuth consent screen, add the scope
  `https://www.googleapis.com/auth/calendar.readonly`
- While the app is in "Testing", add the Google account as a test user.

### 3. Environment

Copy `.env.example` to `.env.local` and fill it in. The same variables go into
Vercel's project settings.

`ALLOWED_EMAIL` is the lock: it is the only Google account that can sign in.

### 4. Run

```
npm install
npm run dev
```

`/preview` renders the board with sample data for design work. It returns 404
in production, so it is never a way around the sign-in.

## Layout

```
src/lib/plan.ts      the 30-60-90 plan as typed data
src/lib/workout.ts   the 4-day cut program
src/lib/day.ts       the adaptive day scheduler
src/lib/dates.ts     day numbers, week lookup, and which mode a date is in
src/lib/google.ts    calendar reads and token refresh
src/app/page.tsx     the daily board
```

## Editing the plan

Everything meant to change over 90 days lives in `src/lib/plan.ts`: weekly
objectives, quotas, daily floors, checkpoints, and the holiday list. Weekly
targets are never raised automatically. The Friday review proposes a raise
after a streak and the decision stays manual.
