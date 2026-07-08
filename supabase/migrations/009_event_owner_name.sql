alter table public.events
  add column if not exists owner_name text
  check (owner_name is null or char_length(owner_name) between 2 and 40);

comment on column public.events.owner_name is
  'Public display name captured from the owner account; email is never exposed.';
