alter table public.transactions
  drop constraint if exists transactions_category_id_fkey;

alter table public.transactions
  add column if not exists tags text[] default '{}';

alter table public.transactions
  add constraint transactions_category_id_fkey
    foreign key (category_id) references public.user_categories(id);
