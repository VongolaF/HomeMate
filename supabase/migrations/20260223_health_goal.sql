-- Add health goal preference to profiles

alter table public.profiles
  add column if not exists health_goal text not null default 'balanced';

DO $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_health_goal_valid'
  ) then
    alter table public.profiles
      add constraint profiles_health_goal_valid
      check (health_goal in (
        'balanced',
        'fat_loss',
        'muscle_gain',
        'endurance',
        'strength',
        'mobility',
        'sleep',
        'blood_sugar'
      ));
  end if;
end $$;
