-- Cierre automático opcional de salas.
alter table public.events
  add column if not exists closes_at timestamptz;

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
  v_event_closes_at timestamptz;
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

  select status, closes_at into v_event_status, v_event_closes_at
  from public.events
  where id = v_invitation.event_id
  for update;

  if v_event_status <> 'results' and v_event_closes_at is not null and v_event_closes_at <= now() then
    update public.events set status = 'results' where id = v_invitation.event_id;
    raise exception 'voting closed';
  end if;

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
