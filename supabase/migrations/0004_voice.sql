-- ---------------------------------------------------------------------------
-- The voice experiment.
--
-- Nelson's advice was to write daily from genuine conviction. The open question
-- is which conviction survives a year, and that is not answerable by deciding.
-- It is answerable by shipping a few deliberately different pieces and watching
-- two things: whether Zach wanted to write the next one, and whether the piece
-- created pull.
--
-- Everything here feeds the Day 30 review, where the answer is supposed to
-- arrive on evidence rather than enthusiasm.
-- ---------------------------------------------------------------------------

-- The argument test. Not what he knows, what makes him want to interrupt.
create table if not exists convictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  -- 1 to 5. How much heat is behind it. Heat is what lasts.
  heat int,
  created_at timestamptz not null default now()
);

alter table convictions enable row level security;
create policy "convictions are private" on convictions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Candidate angles, and the 20-headline test for each. An angle that cannot
-- produce twenty headlines cannot produce two hundred and fifty posts.
create table if not exists angles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  headlines jsonb not null default '[]'::jsonb,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table angles enable row level security;
create policy "angles are private" on angles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists angles_touch on angles;
create trigger angles_touch before update on angles
  for each row execute function touch_updated_at();

-- Pieces actually shipped, and the two scores that matter.
create table if not exists pieces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  angle_id uuid references angles (id) on delete set null,
  -- idea | drafting | shipped | killed
  status text not null default 'idea',
  shipped_on date,
  url text not null default '',

  -- The durability signal. Did you want to write the next one immediately?
  -- This is the one that predicts whether you last a year.
  wanted_next boolean,
  -- The reputation signal. Did it create a conversation, an intro, or inbound?
  created_pull boolean,
  response_notes text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table pieces enable row level security;
create policy "pieces are private" on pieces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists pieces_user_idx on pieces (user_id, shipped_on);

drop trigger if exists pieces_touch on pieces;
create trigger pieces_touch before update on pieces
  for each row execute function touch_updated_at();
