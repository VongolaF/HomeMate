alter table public.transactions
  drop constraint if exists transactions_category_id_fkey;

alter table public.transactions
  add column if not exists tags text[] default '{}';

insert into public.user_categories (user_id, name, icon, type, sort_order, is_active)
select distinct on (t.user_id, c.name, c.type, c.icon)
  t.user_id,
  c.name,
  c.icon,
  c.type,
  0,
  true
from public.transactions t
join public.categories c on c.id = t.category_id
where t.category_id is not null;

with mapping as (
  select t.user_id,
         t.category_id as old_category_id,
         min(u.id) as new_category_id
  from public.transactions t
  join public.categories c on c.id = t.category_id
  join public.user_categories u
    on u.user_id = t.user_id
   and u.name = c.name
   and u.type = c.type
   and coalesce(u.icon, '') = coalesce(c.icon, '')
  where t.category_id is not null
  group by t.user_id, t.category_id
)
update public.transactions t
set category_id = m.new_category_id
from mapping m
where t.user_id = m.user_id
  and t.category_id = m.old_category_id;

update public.transactions t
set category_id = null
where t.category_id is not null
  and not exists (
    select 1 from public.user_categories u
    where u.id = t.category_id
  );

alter table public.transactions
  add constraint transactions_category_id_fkey
    foreign key (category_id) references public.user_categories(id);
