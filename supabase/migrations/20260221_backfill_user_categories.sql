-- Backfill default categories for existing users.
insert into public.user_categories (user_id, name, icon, type, sort_order, is_active)
select
  u.id,
  c.name,
  c.icon,
  c.type,
  row_number() over (partition by u.id, c.type order by c.name) - 1 as sort_order,
  true
from auth.users u
cross join public.categories c
where not exists (
  select 1
  from public.user_categories uc
  where uc.user_id = u.id
    and uc.name = c.name
    and uc.type = c.type
);
