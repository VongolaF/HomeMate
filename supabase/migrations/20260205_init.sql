-- profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  base_currency text default 'CNY'
);

-- categories (read-only)
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  type text not null check (type in ('income','expense'))
);

-- exchange rates
create table exchange_rates (
  id uuid primary key default gen_random_uuid(),
  rate_date date not null,
  from_currency text not null,
  to_currency text not null,
  rate numeric not null
);

-- transactions
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references categories(id),
  amount numeric not null,
  currency text not null,
  amount_base numeric not null,
  type text not null check (type in ('income','expense')),
  occurred_at date not null,
  note text
);

-- events
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_date date not null,
  description text,
  status text default 'open'
);

-- memos
create table memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- savings goals
create table savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_amount numeric not null,
  deadline date,
  rule_amount numeric default 0,
  current_amount numeric default 0
);

-- contributions
create table savings_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references savings_goals(id) on delete cascade,
  amount numeric not null,
  contributed_at date not null
);

-- RLS
alter table categories enable row level security;
alter table exchange_rates enable row level security;
alter table profiles enable row level security;
alter table transactions enable row level security;
alter table events enable row level security;
alter table memos enable row level security;
alter table savings_goals enable row level security;
alter table savings_contributions enable row level security;

create policy "categories read only" on categories for select
  using (true);

create policy "exchange rates read only" on exchange_rates for select
  using (true);

create policy "profiles are self" on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

create policy "transactions are self" on transactions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "events are self" on events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "memos are self" on memos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "goals are self" on savings_goals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "contributions via goal" on savings_contributions for all
  using (exists (select 1 from savings_goals g where g.id = goal_id and g.user_id = auth.uid()))
  with check (exists (select 1 from savings_goals g where g.id = goal_id and g.user_id = auth.uid()));
