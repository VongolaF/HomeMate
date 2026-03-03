import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { DynamicTool } from "@langchain/core/tools";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createHealthChatModel } from "@/lib/health/llm";
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

type RegenerateWeekPlanInput = {
  weekStart?: unknown;
  timezone?: unknown;
  goal?: unknown;
  view?: unknown;
  allowMissingBodyMetrics?: unknown;
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

const isValidTimezone = (value: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const buildWeekDays = (weekStart: Date) => {
  const startMs = weekStart.getTime();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startMs + index * 86400000);
    return date.toISOString().slice(0, 10);
  });
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

const normalizeModelText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
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

type MealRecipe = {
  name: string | null;
  ingredients: string[];
  steps: string[];
  tips: string | null;
};

type MealPlan = {
  date: string;
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
  snacks: string | null;
  notes: string | null;
  breakfast_recipe: MealRecipe | null;
  lunch_recipe: MealRecipe | null;
  dinner_recipe: MealRecipe | null;
  snacks_recipe: MealRecipe | null;
};

type WorkoutPlan = {
  date: string;
  cardio: string | null;
  strength: string | null;
  duration_min: number | null;
  intensity: string | null;
  notes: string | null;
};

const normalizeRecipe = (value: unknown): MealRecipe | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name = normalizeModelText(record.name);
  const ingredients = normalizeStringArray(record.ingredients);
  const steps = normalizeStringArray(record.steps);
  const tips = normalizeModelText(record.tips);

  if (!name && ingredients.length === 0 && steps.length === 0 && !tips) return null;

  return {
    name,
    ingredients,
    steps,
    tips: tips ?? null,
  };
};

const normalizeContent = (content: unknown) => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const combined = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
    return combined || null;
  }
  if (content && typeof content === "object" && "text" in content) {
    return String((content as { text?: unknown }).text ?? "");
  }
  return null;
};

const parsePlans = (
  rawContent: string,
  days: string[]
): { meals: MealPlan[]; workouts: WorkoutPlan[] } | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    const start = rawContent.indexOf("{");
    const end = rawContent.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      parsed = JSON.parse(rawContent.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") return null;

  const mealItems = Array.isArray((parsed as { meals?: unknown }).meals)
    ? ((parsed as { meals: unknown[] }).meals ?? [])
    : [];
  const workoutItems = Array.isArray((parsed as { workouts?: unknown }).workouts)
    ? ((parsed as { workouts: unknown[] }).workouts ?? [])
    : [];

  const mealMap = new Map<string, Record<string, unknown>>();
  for (const item of mealItems) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.date === "string") mealMap.set(record.date, record);
  }

  const workoutMap = new Map<string, Record<string, unknown>>();
  for (const item of workoutItems) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.date === "string") workoutMap.set(record.date, record);
  }

  const meals = days.map((date) => {
    const record = mealMap.get(date) ?? {};
    return {
      date,
      breakfast: normalizeModelText(record.breakfast),
      lunch: normalizeModelText(record.lunch),
      dinner: normalizeModelText(record.dinner),
      snacks: normalizeModelText(record.snacks),
      notes: normalizeModelText(record.notes),
      breakfast_recipe: normalizeRecipe(record.breakfast_recipe),
      lunch_recipe: normalizeRecipe(record.lunch_recipe),
      dinner_recipe: normalizeRecipe(record.dinner_recipe),
      snacks_recipe: normalizeRecipe(record.snacks_recipe),
    };
  });

  const workouts = days.map((date) => {
    const record = workoutMap.get(date) ?? {};
    return {
      date,
      cardio: normalizeModelText(record.cardio),
      strength: normalizeModelText(record.strength),
      duration_min: normalizeDuration(record.duration_min),
      intensity: normalizeModelText(record.intensity),
      notes: normalizeModelText(record.notes),
    };
  });

  return { meals, workouts };
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

const parseRegenerateWeekPlanInput = (input: string) => {
  if (!input || !input.trim()) return {} as RegenerateWeekPlanInput;
  const parsed = parseJsonInput(input) as RegenerateWeekPlanInput | null;
  return parsed ?? ({} as RegenerateWeekPlanInput);
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

const validateTimezone = (value: unknown, context: AgentToolContext) => {
  if (value === undefined) return context.timezone;
  if (typeof value !== "string" || !isValidTimezone(value)) return null;
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

const normalizeView = (value: unknown) => {
  if (value === "meals" || value === "workouts") return value;
  return null;
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
    .select(
      "date, breakfast, lunch, dinner, snacks, notes, breakfast_recipe, lunch_recipe, dinner_recipe, snacks_recipe"
    )
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

const regenerateWeekPlan = async (input: string, context: AgentToolContext) => {
  const payload = parseRegenerateWeekPlanInput(input);

  const weekStart = validateWeekStart(payload.weekStart, context);
  if (!weekStart) return "Invalid weekStart.";

  const timezone = validateTimezone(payload.timezone, context);
  if (!timezone) return "Invalid timezone.";

  const view = normalizeView(payload.view);
  if (!view) return "Invalid view.";

  const requestedGoal = normalizeHealthGoal(payload.goal);
  let savedGoal = DEFAULT_HEALTH_GOAL;
  if (!requestedGoal) {
    const { data: profileRow } = await context.supabase
      .from("profiles")
      .select("health_goal")
      .eq("id", context.userId)
      .maybeSingle();
    const normalized = normalizeHealthGoal(
      (profileRow as { health_goal?: unknown } | null)?.health_goal
    );
    if (normalized) savedGoal = normalized;
  }
  const effectiveGoal = requestedGoal ?? savedGoal;

  const allowMissingBodyMetrics = payload.allowMissingBodyMetrics === true;

  const { data: metricsRow, error: metricsError } = await context.supabase
    .from("body_metrics")
    .select(
      "user_id,height_cm,weight_kg,gender,birthday,age,body_fat_pct,muscle_pct,subcutaneous_fat,visceral_fat,bmi,water_pct,protein_pct,bone_mass,bmr"
    )
    .eq("user_id", context.userId)
    .maybeSingle();

  if (metricsError) {
    return "Failed to load body metrics.";
  }

  const metricsRecord = (metricsRow ?? null) as Record<string, unknown> | null;
  const hasBodyMetrics = Boolean(
    metricsRecord &&
      (
        metricsRecord.height_cm ||
        metricsRecord.weight_kg ||
        metricsRecord.gender ||
        metricsRecord.birthday ||
        metricsRecord.age ||
        metricsRecord.body_fat_pct ||
        metricsRecord.muscle_pct ||
        metricsRecord.subcutaneous_fat ||
        metricsRecord.visceral_fat ||
        metricsRecord.bmi ||
        metricsRecord.water_pct ||
        metricsRecord.protein_pct ||
        metricsRecord.bone_mass ||
        metricsRecord.bmr
      )
  );

  if (!hasBodyMetrics && !allowMissingBodyMetrics) {
    return "检测到你还没有填写身体信息（如身高/体重等），计划会更偏通用。你可以先去个人中心填写：/profile#body。\n\n如果你不想填写，也可以继续生成：请在对话中回复“继续”或“跳过”。";
  }

  const llm = createHealthChatModel({ temperature: 0 });
  if (!llm) return "Missing LLM configuration.";

  const weekStartDate = parseIsoDate(weekStart);
  if (!weekStartDate) return "Invalid weekStart.";

  const days = buildWeekDays(weekStartDate);
  const { user_id: userIdForPrompt, ...metricsForPrompt } = (metricsRecord ?? {}) as Record<
    string,
    unknown
  >;
  void userIdForPrompt;

  const systemPrompt = "你是健康计划助手。只返回 JSON，不要 markdown。所有字段值必须使用简体中文（不要英文）。";

  const basePrompt = `请生成一个简单的 7 天游饮食与训练计划。\n${healthGoalToPrompt(
    effectiveGoal
  )}\n\n目标偏好：\n- 减脂：高蛋白、低油盐、控制精制糖，多用蒸煮/凉拌。\n- 增肌：蛋白充足 + 复合碳水，训练前后补充优质蛋白。\n- 均衡：三大营养比例均衡，蔬菜占比足够。\n\n制作要求：\n- 每餐做法简单，步骤 3-5 步内，食材易获得。\n\n周起始日：${weekStart}\n时区：${timezone}\n日期：${days.join(", ")}\n用户指标：${JSON.stringify(
    metricsForPrompt
  )}`;

  const viewPrompt =
    view === "meals"
      ? "\n\n只返回 JSON，根节点包含 key：meals。\n- meals：长度为 7 的数组，每项包含 date, breakfast, lunch, dinner, snacks, notes, breakfast_recipe, lunch_recipe, dinner_recipe, snacks_recipe。\n- *_recipe：对象包含 name, ingredients(数组), steps(数组), tips(可选)。\n\n要求：\n- 除 date 外，所有文本必须是简体中文；不要输出英文。\n- 文本尽量短、可执行（像真实菜单）。\n- 休息日相关字段用 null。"
      : "\n\n只返回 JSON，根节点包含 key：workouts。\n- workouts：长度为 7 的数组，每项包含 date, cardio, strength, duration_min, intensity, notes。\n\n要求：\n- 除 date 外，所有文本必须是简体中文；不要输出英文。\n- 文本尽量短、可执行（像真实训练安排）。\n- 休息日相关字段用 null。\n- duration_min 必须是整数或 null。";

  let responseContent: unknown;
  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`${basePrompt}${viewPrompt}`),
    ]);
    responseContent = response.content;
  } catch {
    return "LLM request failed.";
  }

  const content = normalizeContent(responseContent);
  if (!content) return "Empty LLM response.";

  const parsedPlans = parsePlans(content, days);
  if (!parsedPlans) return "Invalid LLM response.";

  if (view === "meals") {
    const { data: mealWeek, error: mealWeekError } = await context.supabase
      .from("meal_week_plans")
      .upsert(
        {
          user_id: context.userId,
          week_start_date: weekStart,
          timezone,
          generated_by: "user",
        },
        { onConflict: "user_id,week_start_date" }
      )
      .select("id")
      .single();

    if (mealWeekError || !mealWeek) {
      return "Failed to upsert meal week plan.";
    }

    const mealDayRows = parsedPlans.meals.map((meal) => ({
      week_plan_id: mealWeek.id,
      date: meal.date,
      breakfast: meal.breakfast,
      lunch: meal.lunch,
      dinner: meal.dinner,
      snacks: meal.snacks,
      notes: meal.notes,
      breakfast_recipe: meal.breakfast_recipe,
      lunch_recipe: meal.lunch_recipe,
      dinner_recipe: meal.dinner_recipe,
      snacks_recipe: meal.snacks_recipe,
    }));

    const { error: mealDayError } = await context.supabase
      .from("meal_day_plans")
      .upsert(mealDayRows, { onConflict: "week_plan_id,date" });

    if (mealDayError) return "Failed to upsert meal day plans.";
    return "已重新生成本周饮食计划。";
  }

  const { data: workoutWeek, error: workoutWeekError } = await context.supabase
    .from("workout_week_plans")
    .upsert(
      {
        user_id: context.userId,
        week_start_date: weekStart,
        timezone,
        generated_by: "user",
      },
      { onConflict: "user_id,week_start_date" }
    )
    .select("id")
    .single();

  if (workoutWeekError || !workoutWeek) {
    return "Failed to upsert workout week plan.";
  }

  const workoutDayRows = parsedPlans.workouts.map((workout) => ({
    week_plan_id: workoutWeek.id,
    date: workout.date,
    cardio: workout.cardio,
    strength: workout.strength,
    duration_min: workout.duration_min,
    intensity: workout.intensity,
    notes: workout.notes,
  }));

  const { error: workoutDayError } = await context.supabase
    .from("workout_day_plans")
    .upsert(workoutDayRows, { onConflict: "week_plan_id,date" });

  if (workoutDayError) return "Failed to upsert workout day plans.";
  return "已重新生成本周训练计划。";
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
    name: "regenerate_week_plan",
    description:
      "Regenerate the current week plan for the active view. Input JSON: { weekStart, timezone, view: 'meals'|'workouts', goal?, allowMissingBodyMetrics? }",
    func: (input) => regenerateWeekPlan(input, context),
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
