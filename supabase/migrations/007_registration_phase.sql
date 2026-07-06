-- Ejecuta este archivo UNA VEZ después de 006_result_notifications.sql.
alter table public.events drop constraint if exists events_status_check;
alter table public.events
  add constraint events_status_check
  check (status in ('registration', 'voting', 'results'));
