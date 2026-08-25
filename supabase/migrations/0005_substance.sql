-- ---------------------------------------------------------------------------
-- The substance filter.
--
-- Section 8 of A Return to Substance defines substance as work meeting at least
-- one of three conditions: it embeds tacit cognition, it produces durable
-- results, or it requires a specific person's presence to mean what it means.
--
-- That definition is already a screen. Pointed at a business it says whether
-- the value survives cheap coordination. Pointed at a role it says whether the
-- job is substance or scaffolding. This makes the screen usable.
--
-- The scaffolding field is the other half of the thesis: own the substance,
-- automate the scaffolding. A subject that scores as substance AND has a fat
-- compressible admin layer is the acquisition case.
-- ---------------------------------------------------------------------------
create table if not exists substance_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  subject text not null,
  -- business | role | bet | other
  kind text not null default 'business',
  -- optional link to a CRM record, when the subject is one
  opportunity_id uuid references opportunities (id) on delete set null,

  -- The three conditions. Null means not yet judged, which is different from no.
  tacit boolean,
  tacit_note text not null default '',
  durable boolean,
  durable_note text not null default '',
  presence boolean,
  presence_note text not null default '',

  -- Where the compressible admin layer is. The other half of the thesis.
  scaffolding text not null default '',
  verdict text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table substance_assessments enable row level security;

create policy "substance assessments are private" on substance_assessments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists substance_user_idx on substance_assessments (user_id, kind);

drop trigger if exists substance_touch on substance_assessments;
create trigger substance_touch before update on substance_assessments
  for each row execute function touch_updated_at();
