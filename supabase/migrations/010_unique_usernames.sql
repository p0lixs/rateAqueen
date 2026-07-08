create table if not exists public.usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(btrim(username)) between 2 and 40),
  normalized_username text generated always as (lower(btrim(username))) stored unique,
  created_at timestamptz not null default now()
);

alter table public.usernames enable row level security;

-- Importa las cuentas existentes. Solo los duplicados reciben un sufijo estable.
with raw_candidates as (
  select
    id,
    coalesce(
      nullif(btrim(raw_user_meta_data ->> 'username'), ''),
      nullif(btrim(raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(email, '@', 1), ''),
      'user'
    ) as raw_username
  from auth.users
), candidates as (
  select
    id,
    left(case when char_length(raw_username) >= 2 then raw_username else raw_username || '_' end, 40) as base_username
  from raw_candidates
), ranked as (
  select
    id,
    base_username,
    row_number() over (partition by lower(base_username) order by id) as duplicate_number
  from candidates
), resolved as (
  select
    id,
    case
      when duplicate_number = 1 then base_username
      else left(base_username, 31) || '_' || substr(md5(id::text), 1, 8)
    end as username
  from ranked
)
insert into public.usernames (user_id, username)
select id, username from resolved
on conflict (user_id) do nothing;

update auth.users as users
set raw_user_meta_data = coalesce(users.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('username', names.username, 'display_name', names.username)
from public.usernames as names
where names.user_id = users.id;

update public.events as events
set owner_name = names.username
from public.usernames as names
where events.owner_id = names.user_id
  and events.owner_name is null;

create or replace function public.register_username_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text := btrim(coalesce(
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'display_name',
    ''
  ));
begin
  if char_length(requested_username) not between 2 and 40 then
    raise exception 'invalid username';
  end if;

  insert into public.usernames (user_id, username)
  values (new.id, requested_username);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_register_username on auth.users;
create trigger on_auth_user_created_register_username
  after insert on auth.users
  for each row execute function public.register_username_for_new_user();
