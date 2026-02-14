create table public.user_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  type text not null check (type in ('income','expense')),
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_categories enable row level security;

create policy "user_categories are self" on public.user_categories for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
