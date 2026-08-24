-- Email makes calendar matching exact instead of a guess on names.
alter table opportunities add column if not exists email text not null default '';
create index if not exists opportunities_email_idx on opportunities (user_id, email);

-- People deliberately dismissed from the calendar suggestions. The HVAC
-- contractor should be turned away once, not deleted from the CRM forever.
create table if not exists ignored_contacts (
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, email)
);

alter table ignored_contacts enable row level security;

create policy "ignored contacts are private" on ignored_contacts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
