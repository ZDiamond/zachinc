-- Zach Inc. operating board.
-- Single user, but every table is scoped by user_id and locked with RLS so a
-- leaked anon key cannot read the board.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Google OAuth tokens.
-- Never readable by the browser. Only the server (service_role) touches this,
-- so RLS has no permissive policy at all and every client read returns zero rows.
-- ---------------------------------------------------------------------------
create table if not exists google_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  access_token text,
  expires_at timestamptz,
  scope text,
  updated_at timestamptz not null default now()
);

alter table google_tokens enable row level security;
-- Deliberately no policies. service_role bypasses RLS; nothing else gets in.

-- ---------------------------------------------------------------------------
-- One row per day. The daily board writes here all day.
-- ---------------------------------------------------------------------------
create table if not exists days (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,

  -- CEO open
  outcomes jsonb not null default '["","",""]'::jsonb,
  outcomes_done jsonb not null default '[false,false,false]'::jsonb,

  -- Daily floors, keyed by floor text so reordering the list cannot silently
  -- re-map yesterday's checkmarks onto a different floor.
  floors jsonb not null default '{}'::jsonb,

  -- CEO close journal: ship / learn / opportunity / tomorrow
  ceo_close jsonb not null default '{}'::jsonb,
  commercial_proof text not null default '',

  -- Training. workout_key is what he actually did, which is not always the
  -- session the program scheduled for that weekday.
  workout_key text,
  workout_done boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table days enable row level security;

create policy "days are private" on days
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- One row per week. Quota counters, the four optionality currencies, and the
-- Friday review. `targets` holds per-week overrides of the plan doc's base
-- quotas; it is only ever written from the Friday review, never automatically.
-- ---------------------------------------------------------------------------
create table if not exists weeks (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  week_n int,
  counts jsonb not null default '{}'::jsonb,
  targets jsonb not null default '{}'::jsonb,
  currencies jsonb not null default '{}'::jsonb,
  currency_notes jsonb not null default '{}'::jsonb,
  review text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table weeks enable row level security;

create policy "weeks are private" on weeks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Maintenance to-dos. Their own lane, deliberately separate from the three
-- outcomes so admin work can never masquerade as progress. An open to-do
-- carries forward until it is marked done.
-- ---------------------------------------------------------------------------
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  done_at timestamptz,
  added_on date not null default current_date,
  due_on date,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

alter table todos enable row level security;

create policy "todos are private" on todos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists todos_open_idx on todos (user_id, done, sort);

-- ---------------------------------------------------------------------------
-- keep updated_at honest
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists days_touch on days;
create trigger days_touch before update on days
  for each row execute function touch_updated_at();

drop trigger if exists weeks_touch on weeks;
create trigger weeks_touch before update on weeks
  for each row execute function touch_updated_at();

drop trigger if exists google_tokens_touch on google_tokens;
create trigger google_tokens_touch before update on google_tokens
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Board meeting reviews. One row per checkpoint (Day 30 / 60 / 90): the lane
-- scorecard and the memo. Kept apart from `weeks` because a checkpoint spans
-- several weeks and is a different kind of decision.
-- ---------------------------------------------------------------------------
create table if not exists reviews (
  user_id uuid not null references auth.users (id) on delete cascade,
  checkpoint_day int not null,
  lanes jsonb not null default '{}'::jsonb,
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, checkpoint_day)
);

alter table reviews enable row level security;

create policy "reviews are private" on reviews
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists reviews_touch on reviews;
create trigger reviews_touch before update on reviews
  for each row execute function touch_updated_at();
