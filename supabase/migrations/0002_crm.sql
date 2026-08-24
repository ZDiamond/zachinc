-- ---------------------------------------------------------------------------
-- The opportunity CRM.
--
-- One table, not two. The plan doc mentions a relationship list and an
-- opportunity list, but two overlapping lists is how a CRM stops being
-- maintained. Each row is a person or org carrying a lane, which serves both.
--
-- The fields are the ones Day 1 of the plan doc names: relationship strength,
-- next step, value, energy, last contact, and which optionality currency the
-- opportunity can improve.
-- ---------------------------------------------------------------------------
create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  name text not null,
  org text not null default '',

  -- roles | advisory | substance | rabbi_ari | network
  lane text not null default 'network',
  -- 1 = go deep, 3 = keep warm
  tier int,
  -- how well they know you, 1 to 5
  strength int,
  -- how much the work energizes you, 1 to 5
  energy int,
  -- what it could be worth, in your own words
  value text not null default '',
  -- runway | proof | relationships | reputation
  currency text not null default '',

  -- new | active | proposal | committed | parked | closed
  status text not null default 'new',

  next_step text not null default '',
  next_step_on date,
  last_contact_on date,
  notes text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table opportunities enable row level security;

create policy "opportunities are private" on opportunities
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists opportunities_user_idx on opportunities (user_id, status, next_step_on);

drop trigger if exists opportunities_touch on opportunities;
create trigger opportunities_touch before update on opportunities
  for each row execute function touch_updated_at();
