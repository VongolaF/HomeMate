# Health Meal Recipes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add structured meal recipes (ingredients + steps) to weekly meal plans and show a bottom-panel recipe view when a meal slot is clicked.

**Architecture:** Store recipes in JSONB columns on `meal_day_plans`. Update meal-generation prompts to emit recipe data and parse into DB. Update the meals UI to read recipe fields and render a bottom panel for the selected slot.

**Tech Stack:** Next.js App Router, React, Ant Design, Supabase, LangChain (LLM calls)

---

### Task 1: Add DB fields for meal recipes

**Files:**
- Create: `supabase/migrations/20260226_meal_recipes.sql`

**Step 1: Write the migration**
```sql
ALTER TABLE public.meal_day_plans
  ADD COLUMN IF NOT EXISTS breakfast_recipe jsonb,
  ADD COLUMN IF NOT EXISTS lunch_recipe jsonb,
  ADD COLUMN IF NOT EXISTS dinner_recipe jsonb,
  ADD COLUMN IF NOT EXISTS snacks_recipe jsonb;
```

**Step 2: Run migration locally**
Run: `supabase db reset` (or your normal migration workflow)
Expected: migration applies with no errors

**Step 3: Commit**
```bash
git add supabase/migrations/20260226_meal_recipes.sql
git commit -m "feat: add meal recipe columns"
```

---

### Task 2: Extend LLM prompt to emit recipes

**Files:**
- Modify: `homemate/src/app/api/health/regenerate-week/route.ts`
- Modify: `homemate/src/app/api/health/weekly-generate/route.ts`

**Step 1: Update prompt for meals**
- Add goal-specific guidance (减脂/增肌/均衡) in Chinese.
- Require simple cooking methods.
- Require `*_recipe` fields for each meal with `name/ingredients/steps/tips`.

**Step 2: Update JSON schema text in prompt**
- Add `breakfast_recipe/lunch_recipe/dinner_recipe/snacks_recipe` to the meal item description.

**Step 3: Commit**
```bash
git add homemate/src/app/api/health/regenerate-week/route.ts homemate/src/app/api/health/weekly-generate/route.ts
git commit -m "feat: add recipe output to meal prompts"
```

---

### Task 3: Parse recipe fields into DB

**Files:**
- Modify: `homemate/src/app/api/health/regenerate-week/route.ts`
- Modify: `homemate/src/app/api/health/weekly-generate/route.ts`

**Step 1: Extend meal parsing**
- Accept `*_recipe` fields in the LLM JSON.
- Validate as plain object; keep as JSON for storage.

**Step 2: Persist to DB**
- Include `*_recipe` fields in the `meal_day_plans` upsert rows.

**Step 3: Commit**
```bash
git add homemate/src/app/api/health/regenerate-week/route.ts homemate/src/app/api/health/weekly-generate/route.ts
git commit -m "feat: store meal recipes"
```

---

### Task 4: Add recipe panel UI for meals

**Files:**
- Modify: `homemate/src/app/health/page.tsx`
- Modify: `homemate/src/components/health/MealWeekTable.tsx`

**Step 1: Extend meal plan types**
- Add recipe fields to `MealDayPlanApi` (for meals only).

**Step 2: Track selected meal recipe**
- On meal slot click, store the selected date + slot type in state (already available) and derive recipe data.

**Step 3: Render bottom panel**
- Add a bottom panel below the meal cards that shows recipe content for the selected slot.
- If no recipe, show fallback text.

**Step 4: Commit**
```bash
git add homemate/src/app/health/page.tsx homemate/src/components/health/MealWeekTable.tsx
git commit -m "feat: show meal recipe panel"
```

---

### Task 5: Tests

**Files:**
- Create: `homemate/src/components/health/__tests__/MealRecipePanel.test.tsx`

**Step 1: Write test**
- Render the meal tab with a selected slot and recipe data.
- Assert recipe name, ingredients list, and steps are visible.

**Step 2: Run tests**
Run: `npm test`
Expected: PASS

**Step 3: Commit**
```bash
git add homemate/src/components/health/__tests__/MealRecipePanel.test.tsx
git commit -m "test: cover meal recipe panel"
```

---

### Task 6: Final verification

**Step 1: Run unit tests**
Run: `npm test`
Expected: PASS

**Step 2: Manual check**
- Regenerate week
- Click breakfast/lunch/dinner
- Recipe panel updates

**Step 3: Commit (if needed)**
```bash
git add -A
git commit -m "chore: finalize meal recipe feature"
```
