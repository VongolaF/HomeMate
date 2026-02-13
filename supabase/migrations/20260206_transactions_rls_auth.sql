-- Revert public policies and enforce authenticated ownership

alter table public.transactions enable row level security;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'Allow public read transactions'
  ) then
    drop policy "Allow public read transactions" on public.transactions;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'Allow public insert transactions'
  ) then
    drop policy "Allow public insert transactions" on public.transactions;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'Allow public update transactions'
  ) then
    drop policy "Allow public update transactions" on public.transactions;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'Allow public delete transactions'
  ) then
    drop policy "Allow public delete transactions" on public.transactions;
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'transactions are self'
  ) then
    create policy "transactions are self" on public.transactions for all
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;
