-- Seed a few reminder events for existing users.
insert into public.events (user_id, title, event_date, description, status, priority)
select
  u.id,
  seed.title,
  current_date + seed.offset_days,
  seed.description,
  'open',
  seed.priority
from auth.users u
cross join (
  values
    ('缴房租', 0, '高优先级提醒', 'high'),
    ('健身打卡', 1, '每日运动计划', 'medium'),
    ('购买日用品', 2, '补充生活用品', 'low')
) as seed(title, offset_days, description, priority)
where not exists (
  select 1
  from public.events e
  where e.user_id = u.id
    and e.title = seed.title
    and e.event_date = current_date + seed.offset_days
);
