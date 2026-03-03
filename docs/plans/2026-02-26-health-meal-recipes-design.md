# Health Meal Recipes Design (2026-02-26)

## Overview
Add structured meal recipes to weekly meal plans. Each meal includes a short name, ingredients list, and simple steps. The UI shows the recipe in a bottom panel when a user clicks a meal.

## Goals
- Generate meal plans tailored to the selected health goal.
- Keep recipes simple and fast to prepare.
- Store recipe data in structured fields for stable UI rendering.
- Show a bottom-panel recipe view on meal click.

## Non-Goals
- Full nutritional analysis or calorie tracking.
- Rich media (images, videos) in recipes.
- Editing recipes in the UI (read-only at first).

## Data Model
Extend `meal_day_plans` with four JSONB fields:
- `breakfast_recipe`
- `lunch_recipe`
- `dinner_recipe`
- `snacks_recipe`

Each field stores:
```
{
  "name": string,
  "ingredients": string[],
  "steps": string[],
  "tips"?: string
}
```

Notes:
- Keep existing `breakfast/lunch/dinner/snacks` as short display text.
- Recipe fields are optional; if missing, UI shows a fallback note.

## API Changes
### `/api/health/regenerate-week`
- Update prompt to include goal-based meal guidance and recipe output.
- Parse recipe fields into the new JSONB columns.
- Preserve existing behavior for workouts.

### `/api/health/weekly-generate`
- Update prompt to include recipe output for each meal.
- Parse recipe fields into the new JSONB columns.
- Preserve existing behavior for workouts.

### Prompt Additions (Meals)
- Customize meal choices by health goal.
- Require simple cooking methods (boil/steam/stir-fry, short prep).
- Provide recipes per meal: name, ingredients, steps, optional tips.
- Keep output in Simplified Chinese.

## UI/UX
- In the meals tab, clicking a meal slot opens a bottom panel.
- The panel shows:
  - Title: date + meal type + recipe name
  - Ingredients list (bulleted)
  - Steps list (numbered)
  - Tips (optional)
- Panel is dismissible and updates when a different meal is clicked.
- If no recipe exists, show: "该餐暂无食谱，建议重新生成。"

## Error Handling
- If LLM output lacks recipe fields, store meal text only and mark recipe as missing.
- If LLM fails, keep current error flow.

## Testing
- Unit tests for recipe parsing to ensure JSON shape is respected.
- UI test for bottom panel rendering when a meal is clicked.
- Regression test to ensure workouts and existing meal text still render.
