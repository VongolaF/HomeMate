# Analytics, Events & Calendar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add analytics charts, build the calendar-based reminders module (merged memos), and enlarge the home calendar.

**Architecture:** Use Supabase `transactions` + `categories` to aggregate analytics data client-side for charts. Use `events` table for calendar reminders, with date-based add/edit/delete. Keep login-required access via existing auth gate.

**Tech Stack:** Next.js App Router, React, TypeScript, Ant Design, Recharts, Supabase JS.

---

### Task 1: Add analytics data helpers

**Files:**
- Create: homemate/src/lib/analytics/aggregation.ts
- Test: homemate/src/lib/analytics/__tests__/aggregation.test.ts

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  aggregateMonthlyIncomeExpense,
  aggregateCategoryExpense,
  aggregateBalanceTrend,
} from "../aggregation";

describe("analytics aggregation", () => {
  it("aggregates monthly income/expense", () => {
    const result = aggregateMonthlyIncomeExpense([
      { type: "income", amount_base: 100, occurred_at: "2026-02-01" },
      { type: "expense", amount_base: 40, occurred_at: "2026-02-02" },
    ]);
    expect(result[0].income).toBe(100);
    expect(result[0].expense).toBe(40);
  });

  it("aggregates category expense", () => {
    const result = aggregateCategoryExpense([
      { type: "expense", amount_base: 80, category_name: "餐饮" },
      { type: "expense", amount_base: 20, category_name: "交通" },
    ]);
    expect(result.find((r) => r.name === "餐饮")?.value).toBe(80);
  });

  it("aggregates balance trend", () => {
    const result = aggregateBalanceTrend([
      { type: "income", amount_base: 100, occurred_at: "2026-02-01" },
      { type: "expense", amount_base: 60, occurred_at: "2026-02-01" },
    ]);
    expect(result[0].balance).toBe(40);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/analytics/__tests__/aggregation.test.ts`
Expected: FAIL with module not found or missing exports.

**Step 3: Write minimal implementation**

```ts
export function aggregateMonthlyIncomeExpense(rows) { /* group by month */ }
export function aggregateCategoryExpense(rows) { /* group by category */ }
export function aggregateBalanceTrend(rows) { /* group by day */ }
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/analytics/__tests__/aggregation.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add homemate/src/lib/analytics/aggregation.ts homemate/src/lib/analytics/__tests__/aggregation.test.ts
git commit -m "feat: add analytics aggregation helpers"
```

---

### Task 2: Build analytics charts page

**Files:**
- Modify: homemate/src/app/analytics/page.tsx
- Create: homemate/src/components/analytics/MonthlyIncomeExpenseChart.tsx
- Create: homemate/src/components/analytics/CategoryExpensePie.tsx
- Create: homemate/src/components/analytics/IncomeExpenseBar.tsx
- Create: homemate/src/components/analytics/BalanceTrendChart.tsx
- Create: homemate/src/components/analytics/SpendInsightsCards.tsx

**Step 1: Write the failing test**

```ts
import { render, screen } from "@testing-library/react";
import AnalyticsPage from "../../app/analytics/page";

it("renders analytics charts", () => {
  render(<AnalyticsPage />);
  expect(screen.getByText("统计报表")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/app/analytics/page.test.tsx`
Expected: FAIL (test file not found).

**Step 3: Implement page and charts**

- Fetch transactions + categories via Supabase
- Use aggregation helpers for datasets
- Render chart components with loading/error/empty states

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/app/analytics/page.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add homemate/src/app/analytics/page.tsx homemate/src/components/analytics
 git commit -m "feat: add analytics charts"
```

---

### Task 3: Calendar reminders page (merge memos)

**Files:**
- Modify: homemate/src/app/events/page.tsx
- Modify: homemate/src/app/memos/page.tsx (redirect or reuse events)
- Create: homemate/src/components/events/EventCalendar.tsx
- Create: homemate/src/components/events/EventList.tsx
- Create: homemate/src/components/events/EventFormModal.tsx

**Step 1: Write the failing test**

```ts
import { render, screen } from "@testing-library/react";
import EventsPage from "../../app/events/page";

it("renders calendar reminders page", () => {
  render(<EventsPage />);
  expect(screen.getByText("日历提醒")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/app/events/page.test.tsx`
Expected: FAIL (test file not found).

**Step 3: Implement calendar reminders**

- Calendar supports date click
- Right panel lists events for selected date
- Modal for add/edit with title + date + description
- Save includes user_id

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/app/events/page.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add homemate/src/app/events/page.tsx homemate/src/components/events homemate/src/app/memos/page.tsx
 git commit -m "feat: add calendar reminders"
```

---

### Task 4: Enlarge home calendar

**Files:**
- Modify: homemate/src/components/dashboard/Dashboard.tsx
- Modify: homemate/src/components/dashboard/DashboardCalendar.tsx

**Step 1: Write the failing test**

```ts
import { render, screen } from "@testing-library/react";
import Dashboard from "../Dashboard";

it("shows larger calendar section", () => {
  render(<Dashboard />);
  expect(screen.getByText("日历提醒")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/dashboard/__tests__/Dashboard.test.tsx`
Expected: FAIL if labels/layout differ.

**Step 3: Implement layout change**

- Make calendar card span full width
- Increase calendar card height

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/dashboard/__tests__/Dashboard.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add homemate/src/components/dashboard/Dashboard.tsx homemate/src/components/dashboard/DashboardCalendar.tsx
 git commit -m "feat: enlarge dashboard calendar"
```

---

### Task 5: Navigation clean-up

**Files:**
- Modify: homemate/src/components/SideNav.tsx

**Step 1: Write the failing test**

```ts
import { render, screen } from "@testing-library/react";
import SideNav from "../SideNav";

it("does not render memos entry", () => {
  render(<SideNav />);
  expect(screen.queryByText("备忘")).toBeNull();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/__tests__/SideNav.test.tsx`
Expected: FAIL (test file not found).

**Step 3: Implement**

- Remove memos item
- Optionally rename menu item to “日历提醒”

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/__tests__/SideNav.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add homemate/src/components/SideNav.tsx
 git commit -m "chore: remove memos nav"
```

---

### Task 6: Final verification

Run: `npm run test:run`
Expected: PASS.

---

Plan complete and saved to `docs/plans/2026-02-06-analytics-events-calendar.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
