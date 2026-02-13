-- Add role/username to profiles and create profile on signup

alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_key
  on public.profiles (username);

DO $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_format'
  ) then
    alter table public.profiles
      add constraint profiles_username_format
      check (username is null or username ~ '^[A-Za-z0-9_.-]{3,20}$');
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, display_name, base_currency, role, username)
  values (
    new.id,
    new.raw_user_meta_data ->> 'display_name',
    'CNY',
    case when (new.raw_user_meta_data ->> 'username') = 'admin' then 'admin' else 'user' end,
    new.raw_user_meta_data ->> 'username'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Ensure trigger exists for new auth users
DO $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  end if;
end $$;

-- Optional helper: promote an existing user to admin by email
create or replace function public.set_admin_by_username(target_username text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, role, username)
  select u.id, 'admin', (u.raw_user_meta_data ->> 'username')
  from auth.users u
  where (u.raw_user_meta_data ->> 'username') = target_username
  on conflict (id) do update set role = 'admin', username = excluded.username;
end;
$$;

-- Admin user
-- Username: admin Password: admin123456
