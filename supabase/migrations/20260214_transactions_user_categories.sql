alter table public.transactions
  drop constraint if exists transactions_category_id_fkey;

alter table public.transactions
  add column if not exists tags text[] default '{}';

with distinct_pairs as (
  select distinct t.user_id, t.category_id
  from public.transactions t
  where t.category_id is not null
),
inserted as (
  insert into public.user_categories (user_id, name, icon, type, sort_order, is_active)
  select p.user_id, c.name, c.icon, c.type, 0, true
  from distinct_pairs p
  join public.categories c on c.id = p.category_id
  returning id, user_id, name, icon, type
),
mapping as (
  select p.user_id,
         p.category_id as old_category_id,
         u.id as new_category_id
  from distinct_pairs p
  join public.categories c on c.id = p.category_id
  join public.user_categories u
    on u.user_id = p.user_id
   and u.name = c.name
   and u.type = c.type
   and coalesce(u.icon, '') = coalesce(c.icon, '')
)
update public.transactions t
set category_id = m.new_category_id
from mapping m
where t.user_id = m.user_id
  and t.category_id = m.old_category_id;

alter table public.transactions
  add constraint transactions_category_id_fkey
    foreign key (category_id) references public.user_categories(id);
