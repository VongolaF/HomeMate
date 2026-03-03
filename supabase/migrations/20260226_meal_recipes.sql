ALTER TABLE public.meal_day_plans
  ADD COLUMN IF NOT EXISTS breakfast_recipe jsonb,
  ADD COLUMN IF NOT EXISTS lunch_recipe jsonb,
  ADD COLUMN IF NOT EXISTS dinner_recipe jsonb,
  ADD COLUMN IF NOT EXISTS snacks_recipe jsonb;
