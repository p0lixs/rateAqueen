-- Ejecuta este archivo completo en el SQL Editor de un proyecto nuevo de Supabase.
create extension if not exists pgcrypto;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  admin_token text not null unique,
  owner_id uuid references auth.users(id) on delete set null,
  status text not null default 'voting' check (status in ('voting', 'results')),
  created_at timestamptz not null default now()
);

create table public.queens (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  image_url text not null,
  sort_order integer not null,
  unique (event_id, sort_order)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  nickname text not null check (char_length(nickname) between 1 and 60),
  token text not null unique,
  has_voted boolean not null default false,
  voted_at timestamptz,
  user_id uuid references auth.users(id) on delete set null
);

-- Deliberadamente no tiene invitation_id, token, identidad ni fecha de creación.
-- Por tanto, una papeleta no puede relacionarse con una participante desde la aplicación.
create table public.ballots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  ranking jsonb not null check (jsonb_typeof(ranking) = 'array')
);

create index invitations_event_id_idx on public.invitations(event_id);
create index invitations_user_id_idx on public.invitations(user_id);
create unique index invitations_one_account_per_event_idx on public.invitations(event_id, user_id) where user_id is not null;
create index events_owner_id_idx on public.events(owner_id);
create index queens_event_id_idx on public.queens(event_id);
create index ballots_event_id_idx on public.ballots(event_id);

alter table public.events enable row level security;
alter table public.queens enable row level security;
alter table public.invitations enable row level security;
alter table public.ballots enable row level security;

-- No se crean políticas públicas. Toda lectura/escritura normal pasa por las rutas
-- del servidor usando la service role, que nunca se envía al navegador.

create or replace function public.submit_anonymous_ballot(p_token text, p_ranking uuid[], p_user_id uuid default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations%rowtype;
  v_queen_count integer;
  v_valid_count integer;
  v_event_status text;
begin
  select * into v_invitation
  from public.invitations
  where token = p_token
  for update;

  if not found then
    raise exception 'invalid invitation';
  end if;
  if v_invitation.has_voted then
    raise exception 'already voted';
  end if;

  select status into v_event_status
  from public.events
  where id = v_invitation.event_id
  for update;
  if v_event_status <> 'voting' then
    raise exception 'voting closed';
  end if;

  if p_user_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || v_invitation.event_id::text, 0));
    if v_invitation.user_id is not null and v_invitation.user_id <> p_user_id then
      raise exception 'invitation belongs to another account';
    end if;
    if exists (
      select 1 from public.invitations
      where event_id = v_invitation.event_id and user_id = p_user_id and id <> v_invitation.id
    ) then
      raise exception 'account already participated';
    end if;
  end if;

  select count(*) into v_queen_count
  from public.queens
  where event_id = v_invitation.event_id;

  select count(distinct item) into v_valid_count
  from unnest(p_ranking) as item
  where item in (select id from public.queens where event_id = v_invitation.event_id);

  if cardinality(p_ranking) <> v_queen_count or v_valid_count <> v_queen_count then
    raise exception 'invalid ranking';
  end if;

  insert into public.ballots(event_id, ranking)
  values (v_invitation.event_id, to_jsonb(p_ranking));

  update public.invitations
  set has_voted = true, voted_at = now(), user_id = coalesce(user_id, p_user_id)
  where id = v_invitation.id;

  return 'voting';
end;
$$;

revoke all on function public.submit_anonymous_ballot(text, uuid[], uuid) from public, anon, authenticated;
grant execute on function public.submit_anonymous_ballot(text, uuid[], uuid) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'queen-images',
  'queen-images',
  true,
  5000000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can view queen images"
on storage.objects for select
to public
using (bucket_id = 'queen-images');
