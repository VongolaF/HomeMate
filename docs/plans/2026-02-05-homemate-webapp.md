# HomeMate Web App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a cute, lively personal finance web app with dashboard, charts, calendar, events, memos, and savings goals using Next.js, Ant Design, Supabase, and Recharts.

**Architecture:** Use Next.js App Router with server-side data loading where possible and a thin client data layer via Supabase JS. Persist all user data in Supabase Postgres with RLS per user. Pre-aggregate analytics via SQL views/functions to reduce client compute.

**Tech Stack:** Next.js (React), TypeScript, Ant Design, Recharts, Supabase (Auth + Postgres + RLS), Vitest + Testing Library, Playwright (smoke), Vercel.

---

### Task 1: Scaffold Next.js app and core tooling

**Files:**
- Create: `package.json` (via scaffold)
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `components/` (folder)
- Create: `lib/` (folder)
- Create: `types/` (folder)

**Step 1: Initialize app**
Run: `npx create-next-app@latest homemate --ts --app --eslint --src-dir --import-alias "@/*"`
Expected: App scaffolded in `homemate/` without errors.

**Step 2: Add UI/data deps**
Run: `cd homemate && npm i antd @ant-design/icons @supabase/supabase-js recharts dayjs`
Expected: Packages added.

**Step 3: Add test tooling**
Run: `npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react @playwright/test`
Expected: Dev deps added.

**Step 4: Add Vitest config**
Create: `vitest.config.ts`
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
  },
});
```
Create: `vitest.setup.ts`
```ts
import "@testing-library/jest-dom";
```

**Step 5: Add test script**
Modify: `package.json` scripts
```json
{
  "test": "vitest",
  "test:run": "vitest run",
  "test:ui": "vitest --ui"
}
```

**Step 6: Verify tests run**
Run: `npm run test:run`
Expected: PASS with 0 tests.

**Step 7: Commit**
```bash
git add .
git commit -m "chore: scaffold next app and test tooling"
```

---

### Task 2: Add Ant Design theme + cute UI base

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `components/AppShell.tsx`
- Create: `components/HeaderBar.tsx`
- Create: `components/SideNav.tsx`

**Step 1: Write failing layout test**
Create: `components/__tests__/AppShell.test.tsx`
```tsx
import { render, screen } from "@testing-library/react";
import AppShell from "../AppShell";

test("renders app shell", () => {
  render(<AppShell><div>content</div></AppShell>);
  expect(screen.getByText("HomeMate")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**
Run: `npm run test:run`
Expected: FAIL with “Cannot find module ../AppShell”.

**Step 3: Implement minimal layout**
Create: `components/AppShell.tsx`
```tsx
import { Layout } from "antd";
import HeaderBar from "./HeaderBar";
import SideNav from "./SideNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <HeaderBar />
      <Layout>
        <SideNav />
        <Layout.Content style={{ padding: 24 }}>{children}</Layout.Content>
      </Layout>
    </Layout>
  );
}
```
Create: `components/HeaderBar.tsx`
```tsx
import { Layout, Typography } from "antd";

export default function HeaderBar() {
  return (
    <Layout.Header style={{ background: "#ffe6f0" }}>
      <Typography.Title level={3} style={{ margin: 0, color: "#ff5fa2" }}>
        HomeMate
      </Typography.Title>
    </Layout.Header>
  );
}
```
Create: `components/SideNav.tsx`
```tsx
import { Layout, Menu } from "antd";
import {
  PieChartOutlined,
  CalendarOutlined,
  ProfileOutlined,
  WalletOutlined,
  DashboardOutlined,
} from "@ant-design/icons";

const items = [
  { key: "dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "transactions", icon: <WalletOutlined />, label: "记账" },
  { key: "analytics", icon: <PieChartOutlined />, label: "可视化" },
  { key: "events", icon: <CalendarOutlined />, label: "未来事件" },
  { key: "memos", icon: <ProfileOutlined />, label: "备忘录" },
];

export default function SideNav() {
  return (
    <Layout.Sider width={220} style={{ background: "#fff7fb" }}>
      <Menu mode="inline" items={items} defaultSelectedKeys={["dashboard"]} />
    </Layout.Sider>
  );
}
```

**Step 4: Wire AppShell**
Modify: `app/layout.tsx`
```tsx
import "./globals.css";
import AppShell from "@/components/AppShell";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

**Step 5: Add cute global styles**
Modify: `app/globals.css`
```css
:root {
  color-scheme: light;
}

body {
  background: #fff1f7;
  font-family: "Segoe UI", "PingFang SC", "Noto Sans SC", sans-serif;
}
```

**Step 6: Run tests**
Run: `npm run test:run`
Expected: PASS.

**Step 7: Commit**
```bash
git add .
git commit -m "feat: add app shell with cute theme"
```

---

### Task 3: Configure Supabase client and auth guard

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `components/AuthGate.tsx`
- Modify: `app/page.tsx`

**Step 1: Write failing auth gate test**
Create: `components/__tests__/AuthGate.test.tsx`
```tsx
import { render, screen } from "@testing-library/react";
import AuthGate from "../AuthGate";

test("renders login prompt when no user", () => {
  render(<AuthGate user={null}>content</AuthGate>);
  expect(screen.getByText("请先登录")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**
Run: `npm run test:run`
Expected: FAIL with “Cannot find module ../AuthGate”.

**Step 3: Implement Supabase client**
Create: `lib/supabase/client.ts`
```ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```
Create: `components/AuthGate.tsx`
```tsx
export default function AuthGate({
  user,
  children,
}: {
  user: { id: string } | null;
  children: React.ReactNode;
}) {
  if (!user) return <div style={{ padding: 24 }}>请先登录</div>;
  return <>{children}</>;
}
```

**Step 4: Wire in home page**
Modify: `app/page.tsx`
```tsx
import AuthGate from "@/components/AuthGate";

export default function Home() {
  const user = null;
  return <AuthGate user={user}>Dashboard</AuthGate>;
}
```

**Step 5: Run tests**
Run: `npm run test:run`
Expected: PASS.

**Step 6: Commit**
```bash
git add .
git commit -m "feat: add supabase client and auth gate"
```

---

### Task 4: Define database schema + RLS policies

**Files:**
- Create: `supabase/migrations/20260205_init.sql`
- Create: `supabase/seed.sql`

**Step 1: Write schema SQL**
Create: `supabase/migrations/20260205_init.sql`
```sql
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
alter table profiles enable row level security;
alter table transactions enable row level security;
alter table events enable row level security;
alter table memos enable row level security;
alter table savings_goals enable row level security;
alter table savings_contributions enable row level security;

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
```

**Step 2: Seed categories**
Create: `supabase/seed.sql`
```sql
insert into categories (name, icon, type) values
  ('餐饮', '🍜', 'expense'),
  ('交通', '🚌', 'expense'),
  ('购物', '🛍️', 'expense'),
  ('娱乐', '🎮', 'expense'),
  ('房租', '🏠', 'expense'),
  ('工资', '💰', 'income');
```

**Step 3: Commit**
```bash
git add supabase
git commit -m "feat: add initial database schema and seed"
```

---

### Task 5: Build Dashboard with charts and calendar

**Files:**
- Create: `components/dashboard/StatCards.tsx`
- Create: `components/dashboard/MonthlyTrendChart.tsx`
- Create: `components/dashboard/CategoryPieChart.tsx`
- Create: `components/dashboard/YearlyTrendMini.tsx`
- Create: `components/dashboard/DashboardCalendar.tsx`
- Modify: `app/page.tsx`

**Step 1: Write failing dashboard render test**
Create: `components/dashboard/__tests__/Dashboard.test.tsx`
```tsx
import { render, screen } from "@testing-library/react";
import Dashboard from "../Dashboard";

test("renders dashboard sections", () => {
  render(<Dashboard />);
  expect(screen.getByText("本月支出")).toBeInTheDocument();
  expect(screen.getByText("日历")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**
Run: `npm run test:run`
Expected: FAIL with “Cannot find module ../Dashboard”.

**Step 3: Implement minimal dashboard**
Create: `components/dashboard/Dashboard.tsx`
```tsx
import StatCards from "./StatCards";
import MonthlyTrendChart from "./MonthlyTrendChart";
import CategoryPieChart from "./CategoryPieChart";
import YearlyTrendMini from "./YearlyTrendMini";
import DashboardCalendar from "./DashboardCalendar";

export default function Dashboard() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <StatCards />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <MonthlyTrendChart />
        <CategoryPieChart />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <YearlyTrendMini />
        <DashboardCalendar />
      </div>
    </div>
  );
}
```

**Step 4: Implement chart stubs**
Create: `components/dashboard/StatCards.tsx`
```tsx
import { Card } from "antd";

export default function StatCards() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      <Card title="本月支出">¥0</Card>
      <Card title="本月收入">¥0</Card>
      <Card title="结余">¥0</Card>
      <Card title="目标进度">0%</Card>
    </div>
  );
}
```
Create: `components/dashboard/MonthlyTrendChart.tsx`
```tsx
import { Card } from "antd";

export default function MonthlyTrendChart() {
  return <Card title="月度趋势">图表</Card>;
}
```
Create: `components/dashboard/CategoryPieChart.tsx`
```tsx
import { Card } from "antd";

export default function CategoryPieChart() {
  return <Card title="分类占比">图表</Card>;
}
```
Create: `components/dashboard/YearlyTrendMini.tsx`
```tsx
import { Card } from "antd";

export default function YearlyTrendMini() {
  return <Card title="年度趋势">图表</Card>;
}
```
Create: `components/dashboard/DashboardCalendar.tsx`
```tsx
import { Card, Calendar } from "antd";

export default function DashboardCalendar() {
  return (
    <Card title="日历">
      <Calendar fullscreen={false} />
    </Card>
  );
}
```

**Step 5: Wire dashboard**
Modify: `app/page.tsx`
```tsx
import Dashboard from "@/components/dashboard/Dashboard";

export default function Home() {
  return <Dashboard />;
}
```

**Step 6: Run tests**
Run: `npm run test:run`
Expected: PASS.

**Step 7: Commit**
```bash
git add .
git commit -m "feat: add dashboard skeleton"
```

---

### Task 6: Implement data queries and chart rendering

**Files:**
- Create: `lib/analytics/queries.ts`
- Modify: `components/dashboard/MonthlyTrendChart.tsx`
- Modify: `components/dashboard/CategoryPieChart.tsx`
- Modify: `components/dashboard/YearlyTrendMini.tsx`

**Step 1: Write failing analytics unit test**
Create: `lib/analytics/__tests__/queries.test.ts`
```ts
import { buildMonthlySeries } from "../queries";

test("builds 12-month series", () => {
  const series = buildMonthlySeries([], 2026);
  expect(series).toHaveLength(12);
});
```

**Step 2: Run test to verify it fails**
Run: `npm run test:run`
Expected: FAIL with “Cannot find module ../queries”.

**Step 3: Implement minimal series builder**
Create: `lib/analytics/queries.ts`
```ts
export function buildMonthlySeries(rows: Array<{ month: number; total: number }>, year: number) {
  const map = new Map(rows.map((r) => [r.month, r.total]));
  return Array.from({ length: 12 }, (_, i) => ({
    year,
    month: i + 1,
    total: map.get(i + 1) ?? 0,
  }));
}
```

**Step 4: Run tests**
Run: `npm run test:run`
Expected: PASS.

**Step 5: Commit**
```bash
git add lib/analytics
git commit -m "feat: add analytics helpers"
```

---

### Task 7: Pages for transactions, events, memos, savings

**Files:**
- Create: `app/transactions/page.tsx`
- Create: `app/events/page.tsx`
- Create: `app/memos/page.tsx`
- Create: `app/savings/page.tsx`
- Create: `components/EmptyState.tsx`

**Step 1: Write failing empty state test**
Create: `components/__tests__/EmptyState.test.tsx`
```tsx
import { render, screen } from "@testing-library/react";
import EmptyState from "../EmptyState";

test("renders empty state", () => {
  render(<EmptyState title="暂无数据" />);
  expect(screen.getByText("暂无数据")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**
Run: `npm run test:run`
Expected: FAIL with “Cannot find module ../EmptyState”.

**Step 3: Implement minimal pages**
Create: `components/EmptyState.tsx`
```tsx
import { Empty } from "antd";

export default function EmptyState({ title }: { title: string }) {
  return <Empty description={title} />;
}
```
Create: `app/transactions/page.tsx`
```tsx
import EmptyState from "@/components/EmptyState";

export default function TransactionsPage() {
  return <EmptyState title="暂无记账记录" />;
}
```
Create: `app/events/page.tsx`
```tsx
import EmptyState from "@/components/EmptyState";

export default function EventsPage() {
  return <EmptyState title="暂无事件" />;
}
```
Create: `app/memos/page.tsx`
```tsx
import EmptyState from "@/components/EmptyState";

export default function MemosPage() {
  return <EmptyState title="暂无备忘" />;
}
```
Create: `app/savings/page.tsx`
```tsx
import EmptyState from "@/components/EmptyState";

export default function SavingsPage() {
  return <EmptyState title="暂无目标" />;
}
```

**Step 4: Run tests**
Run: `npm run test:run`
Expected: PASS.

**Step 5: Commit**
```bash
git add .
git commit -m "feat: add module pages"
```

---

### Task 8: Calendar aggregation for events + memos

**Files:**
- Create: `lib/calendar/aggregate.ts`
- Modify: `components/dashboard/DashboardCalendar.tsx`

**Step 1: Write failing aggregation test**
Create: `lib/calendar/__tests__/aggregate.test.ts`
```ts
import { aggregateItemsByDate } from "../aggregate";

test("aggregates items by date", () => {
  const data = aggregateItemsByDate([
    { date: "2026-02-05", type: "event", title: "A" },
    { date: "2026-02-05", type: "memo", title: "B" },
  ]);
  expect(data["2026-02-05"]).toHaveLength(2);
});
```

**Step 2: Run test to verify it fails**
Run: `npm run test:run`
Expected: FAIL with “Cannot find module ../aggregate”.

**Step 3: Implement aggregation helper**
Create: `lib/calendar/aggregate.ts`
```ts
export function aggregateItemsByDate(
  items: Array<{ date: string; type: "event" | "memo"; title: string }>
) {
  return items.reduce<Record<string, typeof items>>((acc, item) => {
    acc[item.date] = acc[item.date] || [];
    acc[item.date].push(item);
    return acc;
  }, {});
}
```

**Step 4: Commit**
```bash
git add lib/calendar
git commit -m "feat: add calendar aggregation"
```

---

### Task 9: Deployment config and env template

**Files:**
- Create: `.env.example`
- Modify: `README.md`

**Step 1: Add env template**
Create: `.env.example`
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Step 2: Add setup instructions**
Modify: `README.md`
```markdown
## Setup

1. Copy `.env.example` to `.env.local`
2. Fill Supabase URL and anon key
3. Run `npm install` and `npm run dev`
```

**Step 3: Commit**
```bash
git add .
git commit -m "docs: add env template and setup"
```

---

### Task 10: Smoke tests

**Files:**
- Create: `tests/smoke.spec.ts`

**Step 1: Add Playwright smoke test**
Create: `tests/smoke.spec.ts`
```ts
import { test, expect } from "@playwright/test";

test("home loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("HomeMate")).toBeVisible();
});
```

**Step 2: Run test**
Run: `npx playwright install --with-deps`
Expected: Browsers installed.

**Step 3: Run test**
Run: `npx playwright test tests/smoke.spec.ts`
Expected: PASS.

**Step 4: Commit**
```bash
git add tests
git commit -m "test: add smoke test"
```

---

### Task 11: Final verification

**Step 1: Run lint**
Run: `npm run lint`
Expected: PASS.

**Step 2: Run unit tests**
Run: `npm run test:run`
Expected: PASS.

**Step 3: Run smoke tests**
Run: `npx playwright test`
Expected: PASS.

**Step 4: Commit**
```bash
git status
```
Expected: Clean working tree.
