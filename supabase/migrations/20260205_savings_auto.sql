-- add auto-aggregation support for savings contributions
alter table savings_contributions
  add column source text default 'manual',
  add column period_key date;

create unique index if not exists savings_contributions_auto_unique
  on savings_contributions (goal_id, period_key)
  where source = 'auto';

create or replace function apply_monthly_savings_rules(run_date date default current_date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  month_key date := date_trunc('month', run_date)::date;
  is_last_day boolean := (run_date = (date_trunc('month', run_date) + interval '1 month - 1 day')::date);
begin
  if not is_last_day then
    return;
  end if;

  insert into savings_contributions (goal_id, amount, contributed_at, source, period_key)
  select id, rule_amount, run_date, 'auto', month_key
  from savings_goals
  where rule_amount > 0
    and not exists (
      select 1
      from savings_contributions sc
      where sc.goal_id = savings_goals.id
        and sc.source = 'auto'
        and sc.period_key = month_key
    );

  update savings_goals g
  set current_amount = coalesce(g.current_amount, 0) + coalesce(t.total, 0)
  from (
    select goal_id, sum(amount) total
    from savings_contributions
    where source = 'auto'
      and period_key = month_key
      and contributed_at = run_date
    group by goal_id
  ) t
  where g.id = t.goal_id;
end;
$$;