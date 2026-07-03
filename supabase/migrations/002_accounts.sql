-- Ejecuta este archivo UNA VEZ si ya instalaste la primera versión de Rate a Queen.
-- Añade cuentas sin modificar ni eliminar las salas y votos existentes.
alter table public.events
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

alter table public.invitations
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists events_owner_id_idx on public.events(owner_id);
create index if not exists invitations_user_id_idx on public.invitations(user_id);
