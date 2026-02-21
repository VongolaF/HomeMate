# Transactions Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the full transactions module with per-user categories, tags, multi-currency normalization, filters, and summary visuals.

**Architecture:** Add a per-user categories table and extend transactions. Build server actions for CRUD and summary queries. Build a hybrid UI (summary + filters + grouped list) with modal add/edit and category management.

**Tech Stack:** Next.js App Router, Supabase, Ant Design, Vitest, Playwright.

---

### Task 1: Add migration for `user_categories`

**Files:**
- Create: `supabase/migrations/20260214_user_categories.sql`

**Step 1: Write the migration**
```sql
create table public.user_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  type text not null check (type in ('income','expense')),
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_categories enable row level security;

create policy "user_categories are self" on public.user_categories for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

**Step 2: Commit**
```bash
git add supabase/migrations/20260214_user_categories.sql
git commit -m "feat(db): add user categories"
```

---

### Task 2: Add migration to update `transactions`

**Files:**
- Create: `supabase/migrations/20260214_transactions_user_categories.sql`

**Step 1: Write the migration**
```sql
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
```

**Step 2: Commit**
```bash
git add supabase/migrations/20260214_transactions_user_categories.sql
git commit -m "feat(db): link transactions to user categories"
```

---

### Task 3: Add types for transactions and categories

**Files:**
- Create: `homemate/src/types/transactions.ts`

**Step 1: Write types**
```ts
export type TransactionType = "income" | "expense";

export interface UserCategory {
  id: string;
  user_id: string;
  name: string;
  icon?: string | null;
  type: TransactionType;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  currency: string;
  amount_base: number;
  type: TransactionType;
  occurred_at: string;
  note?: string | null;
  tags: string[] | null;
}
```

**Step 2: Commit**
```bash
git add homemate/src/types/transactions.ts
git commit -m "feat(types): add transaction types"
```

---

### Task 4: Add data access for categories

**Files:**
- Create: `homemate/src/lib/transactions/categories.ts`
- Modify: `homemate/src/lib/supabase/server.ts`
- Modify: `homemate/package.json`

**Step 1: Add Supabase server client helper**
```ts
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Ignore cookie mutation errors outside actions/handlers.
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Ignore cookie mutation errors outside actions/handlers.
          }
        },
      },
    }
  );
}

export function createSupabaseServerReadClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}
```

**Step 2: Add dependency**
```json
{
  "dependencies": {
    "@supabase/ssr": "^0.6.0"
  }
}
```

**Step 3: Write data helpers**
```ts
import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserCategory } from "@/types/transactions";

export async function listUserCategories(options: { includeInactive?: boolean } = {}) {
  const supabase = createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;

  const userId = userData.user?.id;

  if (!userId) {
    throw new Error("Authenticated user required to list categories.");
  }

  let query = supabase
    .from("user_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .eq("user_id", userId);

  if (!options.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as UserCategory[];
}

export async function upsertUserCategory(input: Partial<UserCategory>) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data.user?.id;

  if (!userId) {
    throw new Error("Authenticated user required to upsert category.");
  }

  const { data, error } = await supabase
    .from("user_categories")
    .upsert({ ...input, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data as UserCategory;
}

export async function deactivateUserCategory(id: string) {
  const supabase = createSupabaseServerClient();
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = data.user?.id;

  if (!userId) {
    throw new Error("Authenticated user required to deactivate category.");
  }

  const { error } = await supabase
    .from("user_categories")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}
```

**Step 4: Commit**
```bash
git add homemate/src/lib/transactions/categories.ts homemate/src/lib/supabase/server.ts homemate/package.json
git commit -m "feat(transactions): add category data helpers"
```

---

### Task 5: Add data access for transactions and summaries

**Files:**
- Create: `homemate/src/lib/transactions/transactions.ts`

**Step 1: Write data helpers**
```ts
import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Transaction } from "@/types/transactions";

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: "income" | "expense";
  categoryIds?: string[];
  minAmount?: number;
  maxAmount?: number;
  tags?: string[];
}

export async function listTransactions(filters: TransactionFilters = {}) {
  const supabase = createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;

  const userId = userData.user?.id;

  if (!userId) {
    throw new Error("Authenticated user required to list transactions.");
  }

  let query = supabase.from("transactions").select("*").eq("user_id", userId);

  if (filters.startDate) query = query.gte("occurred_at", filters.startDate);
  if (filters.endDate) query = query.lte("occurred_at", filters.endDate);
  if (filters.type) query = query.eq("type", filters.type);
  if (Array.isArray(filters.categoryIds) && filters.categoryIds.length) {
    query = query.in("category_id", filters.categoryIds);
  }
  if (filters.minAmount !== undefined) query = query.gte("amount_base", filters.minAmount);
  if (filters.maxAmount !== undefined) query = query.lte("amount_base", filters.maxAmount);
  if (Array.isArray(filters.tags) && filters.tags.length) {
    query = query.overlaps("tags", filters.tags);
  }

  const { data, error } = await query.order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function upsertTransaction(input: Partial<Transaction>) {
  const supabase = createSupabaseServerClient();
  const { data, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;

  const userId = data.user?.id;

  if (!userId) {
    throw new Error("Authenticated user required to upsert transaction.");
  }

  const { data, error } = await supabase
    .from("transactions")
    .upsert({ ...input, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data as Transaction;
}

export async function deleteTransaction(id: string) {
  const supabase = createSupabaseServerClient();
  const { data, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;

  const userId = data.user?.id;

  if (!userId) {
    throw new Error("Authenticated user required to delete transaction.");
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
```

**Step 2: Commit**
```bash
git add homemate/src/lib/transactions/transactions.ts
git commit -m "feat(transactions): add transaction data helpers"
```

---

### Task 6: Add exchange rate helper

**Files:**
- Create: `homemate/src/lib/transactions/exchangeRates.ts`

**Step 1: Write helper**
```ts
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getExchangeRate(
  rateDate: string,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  if (fromCurrency === toCurrency) return 1;

  const dateOnly = rateDate.split("T")[0];
  const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateOnly);
  if (!isValidFormat) return null;

  const parsedDate = new Date(`${dateOnly}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) return null;
  if (parsedDate.toISOString().slice(0, 10) !== dateOnly) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("rate_date", dateOnly)
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const rate = Number(data.rate);
  return Number.isFinite(rate) ? rate : null;
}
```

**Step 2: Commit**
```bash
git add homemate/src/lib/transactions/exchangeRates.ts
git commit -m "feat(transactions): add exchange rate helper"
```

---

### Task 7: Add server actions for transactions

**Files:**
- Create: `homemate/src/app/transactions/actions.ts`

**Step 1: Write server actions**
```ts
"use server";

import { listTransactions, upsertTransaction, deleteTransaction } from "@/lib/transactions/transactions";
import { listUserCategories } from "@/lib/transactions/categories";
import { getExchangeRate } from "@/lib/transactions/exchangeRates";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getTransactionsData(filters: unknown) {
  const safeFilters =
    typeof filters === "object" && filters !== null && !Array.isArray(filters) ? filters : {};
  const [transactions, categories] = await Promise.all([
    listTransactions(safeFilters),
    listUserCategories(),
  ]);
  return { transactions, categories };
}

export async function saveTransaction(input: any) {
  const supabase = createSupabaseServerClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("base_currency")
    .maybeSingle();

  if (profileError) throw profileError;

  const baseCurrency = profile?.base_currency ?? input.currency;

  const rate = await getExchangeRate(input.occurred_at, input.currency, baseCurrency);
  const amount_base = rate === null ? Number(input.amount) : Number(input.amount) * Number(rate);

  const transaction = await upsertTransaction({ ...input, amount_base });
  return { transaction, rateMissing: rate === null };
}

export async function removeTransaction(id: string) {
  return deleteTransaction(id);
}
```

**Step 2: Commit**
```bash
git add homemate/src/app/transactions/actions.ts
git commit -m "feat(transactions): add server actions"
```

---

### Task 8: Build transactions list and filters

**Files:**
- Create: `homemate/src/components/transactions/TransactionsFilters.tsx`
- Create: `homemate/src/components/transactions/TransactionsList.tsx`
- Create: `homemate/src/components/transactions/TransactionsSummary.tsx`
- Create: `homemate/src/components/transactions/TransactionModal.tsx`

**Step 1: Write tests for list grouping**
```tsx
// See existing dashboard tests for patterns.
```

**Step 2: Implement components**
- Filters: date range, type, category, amount range, tags
- Summary: monthly income/expense/net, category share, trend sparkline
- List: group by day, daily subtotal, row actions
- Modal: add/edit form with validation

**Step 3: Run tests**
Run: `npm test -- TransactionsList`
Expected: PASS

**Step 4: Commit**
```bash
git add homemate/src/components/transactions
npx prettier --write homemate/src/components/transactions
npm test -- TransactionsList

git commit -m "feat(transactions): add list and filters"
```

---

### Task 9: Wire the /transactions page

**Files:**
- Modify: `homemate/src/app/transactions/page.tsx`

**Step 1: Implement page**
- Load initial data with `getTransactionsData`.
- Render summary, filters, list, modal trigger.

**Step 2: Commit**
```bash
git add homemate/src/app/transactions/page.tsx
git commit -m "feat(transactions): build page"
```

---

### Task 10: Add category management UI

**Files:**
- Create: `homemate/src/components/transactions/CategoryManager.tsx`

**Step 1: Implement modal**
- List categories with drag reorder.
- Add/edit and deactivate.

**Step 2: Commit**
```bash
git add homemate/src/components/transactions/CategoryManager.tsx
git commit -m "feat(transactions): add category manager"
```

---

### Task 11: Add tests for transactions page

**Files:**
- Create: `homemate/src/app/transactions/page.test.tsx`
- Modify: `homemate/src/components/transactions/__tests__/TransactionsList.test.tsx`

**Step 1: Write tests**
```tsx
// Validate filters and grouped list render.
```

**Step 2: Run tests**
Run: `npm test -- transactions`
Expected: PASS

**Step 3: Commit**
```bash
git add homemate/src/app/transactions/page.test.tsx homemate/src/components/transactions/__tests__/TransactionsList.test.tsx
git commit -m "test(transactions): add page and list tests"
```

---

### Task 12: Add Playwright smoke test

**Files:**
- Modify: `homemate/tests/smoke.spec.ts`

**Step 1: Add flow**
- Add a transaction and verify list updates.

**Step 2: Commit**
```bash
git add homemate/tests/smoke.spec.ts
git commit -m "test(e2e): add transactions smoke"
```

---

## Notes
- Keep UI copy in Chinese to match the rest of the app.
- Use existing dashboard chart components where possible to avoid duplication.
- Deactivate categories instead of deleting when linked.

## Execution
Plan complete and saved to `docs/plans/2026-02-14-transactions-module-implementation.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
