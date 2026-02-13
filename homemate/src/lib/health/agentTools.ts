import { DynamicTool } from "@langchain/core/tools";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type AgentToolContext = {
  supabase: ReturnType<typeof createServerSupabaseClient>;
  userId: string;
  weekStart: string;
  timezone: string;
};

type MealUpdateInput = {
  weekStart?: string;
  date?: string;
  mealType?: string;
  slotType?: string;
  content?: unknown;
};

type MealDayUpdateInput = {
  weekStart?: string;
  date?: string;
  breakfast?: unknown;
  lunch?: unknown;
  dinner?: unknown;
  snacks?: unknown;
  notes?: unknown;
};

type WorkoutDayUpdateInput = {
  weekStart?: string;
  date?: string;
  cardio?: unknown;
  strength?: unknown;
  duration_min?: unknown;
  intensity?: unknown;
  notes?: unknown;
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MEAL_FIELDS = ["breakfast", "lunch", "dinner", "snacks", "notes"] as const;
const WORKOUT_FIELDS = [
  "cardio",
  "strength",
  "duration_min",
  "intensity",
  "notes",
] as const;

type MealField = (typeof MEAL_FIELDS)[number];

type WorkoutField = (typeof WORKOUT_FIELDS)[number];

const parseIsoDate = (value: string) => {
  if (!DATE_REGEX.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
};

const isDateInWeek = (dateValue: string, weekStartValue: string) => {
  const date = parseIsoDate(dateValue);
  const weekStart = parseIsoDate(weekStartValue);
  if (!date || !weekStart) return false;
  const diffMs = date.getTime() - weekStart.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  return diffDays >= 0 && diffDays <= 6;
};

const normalizeText = (value: unknown) => {
  if (value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeDuration = (value: unknown) => {
  if (value === null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
};

const parseJsonInput = (input: string) => {
  try {
    return JSON.parse(input) as Record<string, unknown>;
  } catch (error) {
    return null;
  }
};

const loadWeekPlanId = async (
  context: AgentToolContext,
  table: "meal_week_plans" | "workout_week_plans",
  weekStart: string
) => {
  const { data, error } = await context.supabase
    .from(table)
    .select("id")
    .eq("user_id", context.userId)
    .eq("week_start_date", weekStart)
    .maybeSingle();

  if (error || !data) return null;
  return data.id as string;
};

const validateWeekStart = (value: unknown, context: AgentToolContext) => {
  if (value === undefined) return context.weekStart;
  if (typeof value !== "string" || !parseIsoDate(value)) return null;
  if (value !== context.weekStart) return null;
  return value;
};

const validateDate = (value: unknown, weekStart: string) => {
  if (typeof value !== "string" || !parseIsoDate(value)) return null;
  if (!isDateInWeek(value, weekStart)) return null;
  return value;
};

const buildMealUpdates = (payload: MealDayUpdateInput) => {
  const updates: Partial<Record<MealField, string | null>> = {};
  for (const field of MEAL_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      const normalized = normalizeText(payload[field]);
      if (normalized !== null && typeof normalized !== "string") {
        return null;
      }
      updates[field] = normalized ?? null;
    }
  }
  return Object.keys(updates).length > 0 ? updates : null;
};

const buildWorkoutUpdates = (payload: WorkoutDayUpdateInput) => {
  const updates: Partial<Record<WorkoutField, string | number | null>> = {};
  for (const field of WORKOUT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      if (field === "duration_min") {
        const normalized = normalizeDuration(payload[field]);
        if (normalized !== null && typeof normalized !== "number") {
          return null;
        }
        updates[field] = normalized ?? null;
      } else {
        const normalized = normalizeText(payload[field]);
        if (normalized !== null && typeof normalized !== "string") {
          return null;
        }
        updates[field] = normalized ?? null;
      }
    }
  }
  return Object.keys(updates).length > 0 ? updates : null;
};

const updateMealItem = async (input: string, context: AgentToolContext) => {
  const payload = parseJsonInput(input) as MealUpdateInput | null;
  if (!payload) return "Invalid tool input. Provide JSON.";

  const weekStart = validateWeekStart(payload.weekStart, context);
  if (!weekStart) return "Invalid weekStart.";

  const date = validateDate(payload.date, weekStart);
  if (!date) return "Invalid date.";

  const mealType = payload.mealType ?? payload.slotType;

  if (!mealType || !MEAL_FIELDS.includes(mealType as MealField)) {
    return "Invalid meal type.";
  }

  const normalized = normalizeText(payload.content);
  if (normalized !== null && typeof normalized !== "string") {
    return "Invalid meal content.";
  }

  const weekPlanId = await loadWeekPlanId(context, "meal_week_plans", weekStart);
  if (!weekPlanId) return "Meal week plan not found.";

  const { error } = await context.supabase
    .from("meal_day_plans")
    .upsert(
      {
        week_plan_id: weekPlanId,
        date,
        [mealType]: normalized,
      },
      { onConflict: "week_plan_id,date" }
    );

  if (error) return "Failed to update meal plan.";
  return "Meal plan updated.";
};

const updateMealDay = async (input: string, context: AgentToolContext) => {
  const payload = parseJsonInput(input) as MealDayUpdateInput | null;
  if (!payload) return "Invalid tool input. Provide JSON.";

  const weekStart = validateWeekStart(payload.weekStart, context);
  if (!weekStart) return "Invalid weekStart.";

  const date = validateDate(payload.date, weekStart);
  if (!date) return "Invalid date.";

  const updates = buildMealUpdates(payload);
  if (!updates) return "Invalid meal updates.";

  const weekPlanId = await loadWeekPlanId(context, "meal_week_plans", weekStart);
  if (!weekPlanId) return "Meal week plan not found.";

  const { error } = await context.supabase
    .from("meal_day_plans")
    .upsert(
      {
        week_plan_id: weekPlanId,
        date,
        ...updates,
      },
      { onConflict: "week_plan_id,date" }
    );

  if (error) return "Failed to update meal plan.";
  return "Meal day plan updated.";
};

const updateWorkoutDay = async (input: string, context: AgentToolContext) => {
  const payload = parseJsonInput(input) as WorkoutDayUpdateInput | null;
  if (!payload) return "Invalid tool input. Provide JSON.";

  const weekStart = validateWeekStart(payload.weekStart, context);
  if (!weekStart) return "Invalid weekStart.";

  const date = validateDate(payload.date, weekStart);
  if (!date) return "Invalid date.";

  const updates = buildWorkoutUpdates(payload);
  if (!updates) return "Invalid workout updates.";

  const weekPlanId = await loadWeekPlanId(
    context,
    "workout_week_plans",
    weekStart
  );
  if (!weekPlanId) return "Workout week plan not found.";

  const { error } = await context.supabase
    .from("workout_day_plans")
    .upsert(
      {
        week_plan_id: weekPlanId,
        date,
        ...updates,
      },
      { onConflict: "week_plan_id,date" }
    );

  if (error) return "Failed to update workout plan.";
  return "Workout day plan updated.";
};

export const buildHealthAgentTools = (context: AgentToolContext) => [
  new DynamicTool({
    name: "update_meal_item",
    description:
      "Update a single meal slot. Input JSON: { weekStart, date, mealType|slotType, content }",
    func: (input) => updateMealItem(input, context),
  }),
  new DynamicTool({
    name: "update_meal_day",
    description:
      "Update meal plan for a day. Input JSON: { weekStart, date, breakfast, lunch, dinner, snacks, notes }",
    func: (input) => updateMealDay(input, context),
  }),
  new DynamicTool({
    name: "update_workout_day",
    description:
      "Update workout plan for a day. Input JSON: { weekStart, date, cardio, strength, duration_min, intensity, notes }",
    func: (input) => updateWorkoutDay(input, context),
  }),
];
