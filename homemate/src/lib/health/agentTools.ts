import { DynamicTool } from "@langchain/core/tools";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DEFAULT_HEALTH_GOAL,
  healthGoalToPrompt,
  normalizeHealthGoal,
} from "@/lib/health/goals";

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

type WeekPlanReadInput = {
  weekStart?: unknown;
};

type SuggestMealIdeasInput = {
  weekStart?: unknown;
  date?: unknown;
  mealType?: unknown;
  slotType?: unknown;
  goal?: unknown;
  note?: unknown;
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

const parseWeekReadInput = (input: string) => {
  if (!input || !input.trim()) return {} as WeekPlanReadInput;
  const parsed = parseJsonInput(input) as WeekPlanReadInput | null;
  return parsed ?? ({} as WeekPlanReadInput);
};

const parseSuggestMealIdeasInput = (input: string) => {
  if (!input || !input.trim()) return {} as SuggestMealIdeasInput;
  const parsed = parseJsonInput(input) as SuggestMealIdeasInput | null;
  return parsed ?? ({} as SuggestMealIdeasInput);
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

const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snacks"] as const;
type MealSlot = (typeof MEAL_SLOTS)[number];

const normalizeMealSlot = (value: unknown): MealSlot | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return (MEAL_SLOTS as readonly string[]).includes(trimmed) ? (trimmed as MealSlot) : null;
};

const mealSlotLabel: Record<MealSlot, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snacks: "加餐",
};

const buildStaticIdeas = (slot: MealSlot, goal: string) => {
  const isFatLoss = goal === "fat_loss";
  const isMuscleGain = goal === "muscle_gain";

  const baseBySlot: Record<MealSlot, string[]> = {
    breakfast: [
      "希腊酸奶 + 蓝莓 + 一小把坚果",
      "燕麦粥 + 鸡蛋（水煮/煎蛋少油）",
      "全麦吐司 + 牛油果 + 煎蛋",
      "豆浆 + 鸡蛋 + 番茄/黄瓜",
      "香蕉 + 花生酱（薄抹）+ 牛奶/无糖酸奶",
    ],
    lunch: [
      "鸡胸/鸡腿排 + 西兰花/时蔬 + 糙米/红薯",
      "三文鱼/鳕鱼 + 沙拉碗（加豆类/玉米）",
      "牛肉番茄意面（全麦面更佳）+ 一份蔬菜",
      "豆腐/鸡蛋 + 什锦蔬菜炒（少油少盐）",
      "盖饭：卤牛肉/卤鸡 + 半碗米饭 + 双倍蔬菜",
    ],
    dinner: [
      "清炒时蔬 + 瘦肉/鱼/豆腐 + 少量主食",
      "番茄蛋花汤 + 凉拌黄瓜 + 一份蛋白（鸡/鱼/豆）",
      "杂粮粥 + 卤鸡/卤牛 + 蔬菜",
      "菌菇鸡肉/牛肉炒（少油）+ 一份蔬菜",
      "沙拉 + 煎/烤蛋白（鸡胸/虾/豆腐）",
    ],
    snacks: [
      "水果（1 份）+ 无糖酸奶",
      "蛋白棒/蛋白奶（看配料表低糖）",
      "一小把坚果 + 水果",
      "水煮蛋 1-2 个",
      "毛豆/豆干（少盐）",
    ],
  };

  const fatLossTweaks = [
    "优先：高蛋白 + 高纤维（蔬菜/豆类），少油少糖",
    "主食可减到半份，或用红薯/杂粮替代",
  ];

  const muscleGainTweaks = [
    "优先：蛋白充足（每餐至少 1 掌心蛋白）+ 适量主食",
    "训练日可把主食/优质脂肪（坚果/牛油果）略加一点",
  ];

  return {
    ideas: baseBySlot[slot],
    tweaks: isFatLoss ? fatLossTweaks : isMuscleGain ? muscleGainTweaks : ["以可持续为主，注意蛋白 + 蔬菜 + 适量主食"] ,
  };
};

const suggestMealIdeas = async (input: string, context: AgentToolContext) => {
  const payload = parseSuggestMealIdeasInput(input);

  const weekStart = validateWeekStart(payload.weekStart, context);
  if (!weekStart) return "Invalid weekStart.";

  const slot =
    normalizeMealSlot(payload.mealType) ||
    normalizeMealSlot(payload.slotType) ||
    ("lunch" as MealSlot);

  const date =
    payload.date === undefined
      ? null
      : validateDate(payload.date, weekStart);
  if (payload.date !== undefined && !date) return "Invalid date.";

  const goal = normalizeHealthGoal(payload.goal) ?? DEFAULT_HEALTH_GOAL;
  const note = normalizeText(payload.note);
  if (note !== null && typeof note !== "string") return "Invalid note.";

  let planned: string | null = null;
  if (date) {
    const weekPlanId = await loadWeekPlanId(context, "meal_week_plans", weekStart);
    if (weekPlanId) {
      const { data } = await context.supabase
        .from("meal_day_plans")
        .select("breakfast, lunch, dinner, snacks")
        .eq("week_plan_id", weekPlanId)
        .eq("date", date)
        .maybeSingle();

      const record = (data ?? null) as Record<string, unknown> | null;
      const value = record ? record[slot] : null;
      planned = typeof value === "string" ? value : null;
    }
  }

  const { ideas, tweaks } = buildStaticIdeas(slot, goal);

  const headerLines: string[] = [];
  headerLines.push(`${mealSlotLabel[slot]}建议`);
  headerLines.push(healthGoalToPrompt(goal));
  if (date) headerLines.push(`日期：${date}`);
  if (planned) headerLines.push(`你当前计划的${mealSlotLabel[slot]}：${planned}`);
  if (note) headerLines.push(`补充：${note}`);

  const lines: string[] = [];
  lines.push(...headerLines);
  lines.push("备选想法（任选 1 个）：");
  ideas.slice(0, 5).forEach((idea, index) => {
    lines.push(`${index + 1}. ${idea}`);
  });
  lines.push("小贴士：");
  tweaks.forEach((tip, index) => {
    lines.push(`${index + 1}. ${tip}`);
  });
  lines.push("如果你有忌口/过敏/预算/能否外卖等限制，告诉我我再把建议收敛到更具体。");

  return lines.join("\n");
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

const readMealWeek = async (input: string, context: AgentToolContext) => {
  const payload = parseWeekReadInput(input);
  const weekStart = validateWeekStart(payload.weekStart, context);
  if (!weekStart) return "Invalid weekStart.";

  const weekPlanId = await loadWeekPlanId(context, "meal_week_plans", weekStart);
  if (!weekPlanId) return JSON.stringify({ weekStart, dayPlans: [] });

  const { data, error } = await context.supabase
    .from("meal_day_plans")
    .select("date, breakfast, lunch, dinner, snacks, notes")
    .eq("week_plan_id", weekPlanId)
    .order("date", { ascending: true });

  if (error) return "Failed to load meal plan.";

  return JSON.stringify({ weekStart, dayPlans: data ?? [] });
};

const readWorkoutWeek = async (input: string, context: AgentToolContext) => {
  const payload = parseWeekReadInput(input);
  const weekStart = validateWeekStart(payload.weekStart, context);
  if (!weekStart) return "Invalid weekStart.";

  const weekPlanId = await loadWeekPlanId(context, "workout_week_plans", weekStart);
  if (!weekPlanId) return JSON.stringify({ weekStart, dayPlans: [] });

  const { data, error } = await context.supabase
    .from("workout_day_plans")
    .select("date, cardio, strength, duration_min, intensity, notes")
    .eq("week_plan_id", weekPlanId)
    .order("date", { ascending: true });

  if (error) return "Failed to load workout plan.";

  return JSON.stringify({ weekStart, dayPlans: data ?? [] });
};

export const buildHealthAgentTools = (context: AgentToolContext) => [
  new DynamicTool({
    name: "get_meal_week_plan",
    description:
      "Read the current user's meal week plan for this weekStart. Input JSON optional: { weekStart }. Returns JSON string.",
    func: (input) => readMealWeek(input, context),
  }),
  new DynamicTool({
    name: "suggest_meal_ideas",
    description:
      "Suggest what to eat for a single meal (breakfast/lunch/dinner/snacks). This tool MUST NOT update the database. Input JSON: { weekStart, date?, mealType?, goal?, note? }. Returns plain text suggestions.",
    func: (input) => suggestMealIdeas(input, context),
  }),
  new DynamicTool({
    name: "get_workout_week_plan",
    description:
      "Read the current user's workout week plan for this weekStart. Input JSON optional: { weekStart }. Returns JSON string.",
    func: (input) => readWorkoutWeek(input, context),
  }),
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
