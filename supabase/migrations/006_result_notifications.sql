-- Ejecuta este archivo UNA VEZ después de 005_public_rooms.sql.
alter table public.events add column if not exists owner_results_viewed_at timestamptz;
alter table public.invitations add column if not exists results_viewed_at timestamptz;

create index if not exists events_unseen_owner_results_idx
on public.events(owner_id, status)
where owner_results_viewed_at is null;

create index if not exists invitations_unseen_results_idx
on public.invitations(user_id)
where results_viewed_at is null;
