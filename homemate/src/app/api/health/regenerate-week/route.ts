import { NextResponse } from "next/server";

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createClient } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createHealthChatModel } from "@/lib/health/llm";
import {
  DEFAULT_HEALTH_GOAL,
  healthGoalToPrompt,
  normalizeHealthGoal,
} from "@/lib/health/goals";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

type MealRecipe = {
  name: string | null;
  ingredients: string[];
  steps: string[];
  tips: string | null;
};

type WorkoutPlan = {
  date: string;
  cardio: string | null;
  strength: string | null;
  duration_min: number | null;
  intensity: string | null;
  notes: string | null;
};

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

const normalizeText = (value: unknown) => {
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

const normalizeRecipe = (value: unknown): MealRecipe | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name = normalizeText(record.name);
  const ingredients = normalizeStringArray(record.ingredients);
  const steps = normalizeStringArray(record.steps);
  const tips = normalizeText(record.tips);

  if (!name && ingredients.length === 0 && steps.length === 0 && !tips) return null;

  return {
    name,
    ingredients,
    steps,
    tips: tips ?? null,
  };
};

const normalizeDuration = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 ? Math.round(value) : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
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
      breakfast: normalizeText(record.breakfast),
      lunch: normalizeText(record.lunch),
      dinner: normalizeText(record.dinner),
      snacks: normalizeText(record.snacks),
      notes: normalizeText(record.notes),
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
      cardio: normalizeText(record.cardio),
      strength: normalizeText(record.strength),
      duration_min: normalizeDuration(record.duration_min),
      intensity: normalizeText(record.intensity),
      notes: normalizeText(record.notes),
    };
  });

  return { meals, workouts };
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authClient = createServerSupabaseClient(request);
  const { data: userData, error: userError } = await authClient.auth.getUser();

  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    weekStart?: string;
    timezone?: string;
    goal?: unknown;
    allowMissingBodyMetrics?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const weekStart = body.weekStart;
  const timezone = body.timezone;

  if (typeof weekStart !== "string" || !parseIsoDate(weekStart)) {
    return NextResponse.json({ error: "Missing or invalid weekStart" }, { status: 400 });
  }

  if (typeof timezone !== "string" || !isValidTimezone(timezone)) {
    return NextResponse.json({ error: "Missing or invalid timezone" }, { status: 400 });
  }

  const requestedGoal = normalizeHealthGoal(body.goal);
  let savedGoal = DEFAULT_HEALTH_GOAL;
  if (!requestedGoal) {
    const { data: profileRow } = await authClient
      .from("profiles")
      .select("health_goal")
      .eq("id", userData.user.id)
      .maybeSingle();
    const normalized = normalizeHealthGoal(
      (profileRow as { health_goal?: unknown } | null)?.health_goal
    );
    if (normalized) savedGoal = normalized;
  }
  const effectiveGoal = requestedGoal ?? savedGoal;

  const allowMissingBodyMetrics = body.allowMissingBodyMetrics === true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Missing Supabase service role configuration" }, { status: 500 });
  }

  const llm = createHealthChatModel({ temperature: 0 });
  if (!llm) {
    return NextResponse.json({ error: "Missing LLM configuration" }, { status: 500 });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const userId = userData.user.id;

  const { data: metricsRow, error: metricsError } = await serviceClient
    .from("body_metrics")
    .select(
      "user_id,height_cm,weight_kg,gender,age,body_fat_pct,muscle_pct,subcutaneous_fat,visceral_fat,bmi,water_pct,protein_pct,bone_mass,bmr"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (metricsError) {
    return NextResponse.json({ error: "Failed to load body metrics" }, { status: 500 });
  }

  const metricsRecord = (metricsRow ?? null) as Record<string, unknown> | null;
  const hasBodyMetrics = Boolean(
    metricsRecord &&
      (
        metricsRecord.height_cm ||
        metricsRecord.weight_kg ||
        metricsRecord.gender ||
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
    return NextResponse.json(
      {
        error: "BODY_METRICS_CONFIRMATION_REQUIRED",
        requiresConfirmation: true,
        confirmationHint:
          "检测到你还没有填写身体信息（如身高/体重等），计划会更偏通用。你可以先去个人中心填写：/profile#body。\n\n如果你不想填写，也可以继续生成：请在对话中回复“继续”或“跳过”。",
      },
      { status: 409 }
    );
  }

  const weekStartDate = parseIsoDate(weekStart)!;
  const days = buildWeekDays(weekStartDate);

  const { user_id: userIdForPrompt, ...metricsForPrompt } = (metricsRecord ?? {}) as Record<
    string,
    unknown
  >;
  void userIdForPrompt;

  const systemPrompt = "你是健康计划助手。只返回 JSON，不要 markdown。所有字段值必须使用简体中文（不要英文）。";
  const userPrompt = `请生成一个简单的 7 天游饮食与训练计划。\n${healthGoalToPrompt(effectiveGoal)}\n\n目标偏好：\n- 减脂：高蛋白、低油盐、控制精制糖，多用蒸煮/凉拌。\n- 增肌：蛋白充足 + 复合碳水，训练前后补充优质蛋白。\n- 均衡：三大营养比例均衡，蔬菜占比足够。\n\n制作要求：\n- 每餐做法简单，步骤 3-5 步内，食材易获得。\n\n周起始日：${weekStart}\n时区：${timezone}\n日期：${days.join(", ")}\n用户指标：${JSON.stringify(metricsForPrompt)}\n\n只返回 JSON，根节点包含 keys：meals 和 workouts。\n- meals：长度为 7 的数组，每项包含 date, breakfast, lunch, dinner, snacks, notes, breakfast_recipe, lunch_recipe, dinner_recipe, snacks_recipe。\n- *_recipe：对象包含 name, ingredients(数组), steps(数组), tips(可选)。\n- workouts：长度为 7 的数组，每项包含 date, cardio, strength, duration_min, intensity, notes。\n\n要求：\n- 除 date 外，所有文本必须是简体中文；不要输出英文。\n- 文本尽量短、可执行（像真实菜单/训练安排）。\n- 休息日相关字段用 null。\n- duration_min 必须是整数或 null。`;

  let responseContent: unknown;
  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);
    responseContent = response.content;
  } catch (error) {
    const details =
      process.env.NODE_ENV !== "production"
        ? { message: error instanceof Error ? error.message : String(error) }
        : undefined;
    return NextResponse.json(
      { error: "LLM request failed", ...(details ? { details } : {}) },
      { status: 502 }
    );
  }

  const content = normalizeContent(responseContent);
  if (!content) {
    return NextResponse.json({ error: "Empty LLM response" }, { status: 502 });
  }

  const parsedPlans = parsePlans(content, days);
  if (!parsedPlans) {
    return NextResponse.json({ error: "Invalid LLM response" }, { status: 502 });
  }

  const { meals, workouts } = parsedPlans;

  const { data: mealWeek, error: mealWeekError } = await serviceClient
    .from("meal_week_plans")
    .upsert(
      {
        user_id: userId,
        week_start_date: weekStart,
        timezone,
        generated_by: "user",
      },
      { onConflict: "user_id,week_start_date" }
    )
    .select("id")
    .single();

  if (mealWeekError || !mealWeek) {
    return NextResponse.json({ error: "Failed to upsert meal week plan" }, { status: 500 });
  }

  const { data: workoutWeek, error: workoutWeekError } = await serviceClient
    .from("workout_week_plans")
    .upsert(
      {
        user_id: userId,
        week_start_date: weekStart,
        timezone,
        generated_by: "user",
      },
      { onConflict: "user_id,week_start_date" }
    )
    .select("id")
    .single();

  if (workoutWeekError || !workoutWeek) {
    return NextResponse.json({ error: "Failed to upsert workout week plan" }, { status: 500 });
  }

  const mealDayRows = meals.map((meal) => ({
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

  const { error: mealDayError } = await serviceClient
    .from("meal_day_plans")
    .upsert(mealDayRows, { onConflict: "week_plan_id,date" });

  if (mealDayError) {
    return NextResponse.json({ error: "Failed to upsert meal day plans" }, { status: 500 });
  }

  const workoutDayRows = workouts.map((workout) => ({
    week_plan_id: workoutWeek.id,
    date: workout.date,
    cardio: workout.cardio,
    strength: workout.strength,
    duration_min: workout.duration_min,
    intensity: workout.intensity,
    notes: workout.notes,
  }));

  const { error: workoutDayError } = await serviceClient
    .from("workout_day_plans")
    .upsert(workoutDayRows, { onConflict: "week_plan_id,date" });

  if (workoutDayError) {
    return NextResponse.json({ error: "Failed to upsert workout day plans" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
