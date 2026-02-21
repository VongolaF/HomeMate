alter table public.events
  add column if not exists priority text default 'medium' check (priority in ('low','medium','high'));
