-- Descripción opcional que explica qué se vota en la sala.
alter table public.events
add column if not exists description text
check (description is null or char_length(description) <= 500);
