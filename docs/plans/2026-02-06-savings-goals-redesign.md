# Savings Goals Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the savings goals module into a multi-goal dashboard with short-term/long-term grouping and remove goal completion from the home stats.

**Architecture:** Use the existing `savings_goals` and `savings_contributions` tables. Compute groupings client-side based on deadline (<= 6 months for short-term). Render grouped card grids with status tags and progress. Keep CRUD and contribution flows intact.

**Tech Stack:** Next.js App Router, React, TypeScript, Ant Design, Supabase JS.

---

### Task 1: Remove goal completion from home stats

**Files:**
- Modify: homemate/src/components/dashboard/StatCards.tsx

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import StatCards from "../StatCards";

it("does not render goal progress card", () => {
  render(<StatCards />);
  expect(screen.queryByText("目标完成度")).toBeNull();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/dashboard/__tests__/StatCards.test.tsx`
Expected: FAIL (test file not found or card still rendered)

**Step 3: Implement minimal change**

- Remove the goal progress card from StatCards.
- Adjust grid layout accordingly.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/dashboard/__tests__/StatCards.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add homemate/src/components/dashboard/StatCards.tsx
 git commit -m "chore: remove goal progress from home"
```

---

### Task 2: Add grouping helpers for savings goals

**Files:**
- Create: homemate/src/lib/savings/grouping.ts
- Test: homemate/src/lib/savings/__tests__/grouping.test.ts

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { groupGoalsByHorizon } from "../grouping";

it("groups goals by deadline horizon", () => {
  const result = groupGoalsByHorizon([
    { id: "1", deadline: "2026-06-01" },
    { id: "2", deadline: "2027-01-01" },
    { id: "3", deadline: null },
  ]);
  expect(result.shortTerm).toHaveLength(1);
  expect(result.longTerm).toHaveLength(1);
  expect(result.noDeadline).toHaveLength(1);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/savings/__tests__/grouping.test.ts`
Expected: FAIL

**Step 3: Implement minimal code**

```ts
export function groupGoalsByHorizon(goals) { /* split by <= 6 months */ }
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/savings/__tests__/grouping.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add homemate/src/lib/savings/grouping.ts homemate/src/lib/savings/__tests__/grouping.test.ts
 git commit -m "feat: add savings goal grouping"
```

---

### Task 3: Redesign savings goals page

**Files:**
- Modify: homemate/src/app/savings/page.tsx
- Create: homemate/src/components/savings/GoalCard.tsx
- Create: homemate/src/components/savings/GoalsSection.tsx

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import SavingsPage from "../../app/savings/page";

it("renders grouped savings sections", () => {
  render(<SavingsPage />);
  expect(screen.getByText("短期目标")).toBeInTheDocument();
  expect(screen.getByText("长期目标")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/app/savings/page.test.tsx`
Expected: FAIL

**Step 3: Implement redesign**

- Use grouping helper to split goals.
- Render three sections: 短期目标 / 长期目标 / 无截止日期.
- Each section is a card grid with GoalCard.
- GoalCard shows title, progress, deadline, current/target, and status tag.
- Keep add/edit/delete and contribution drawer.

**Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/app/savings/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add homemate/src/app/savings/page.tsx homemate/src/components/savings
 git commit -m "feat: redesign savings goals page"
```

---

### Task 4: Verification

Run: `npm run test:run`
Expected: PASS

---

Plan complete and saved to `docs/plans/2026-02-06-savings-goals-redesign.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
