-- Create body metrics table for user health data

create table if not exists public.body_metrics (
  user_id uuid primary key references auth.users(id) on delete cascade,
  height_cm numeric,
  weight_kg numeric,
  gender text,
  birthday date,
  age integer,
  body_fat_pct numeric,
  muscle_pct numeric,
  subcutaneous_fat numeric,
  visceral_fat numeric,
  bmi numeric,
  water_pct numeric,
  protein_pct numeric,
  bone_mass numeric,
  bmr numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.body_metrics enable row level security;

create policy "body metrics are self" on public.body_metrics for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
