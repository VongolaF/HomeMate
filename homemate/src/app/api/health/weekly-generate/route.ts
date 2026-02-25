import { NextResponse } from "next/server";

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createClient } from "@supabase/supabase-js";

import { createHealthChatModels } from "@/lib/health/llm";
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
  } catch (error) {
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
  } catch (error) {
    const start = rawContent.indexOf("{");
    const end = rawContent.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    try {
      parsed = JSON.parse(rawContent.slice(start, end + 1));
    } catch (innerError) {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;

  const mealItems = Array.isArray((parsed as { meals?: unknown }).meals)
    ? (parsed as { meals: unknown[] }).meals
    : [];
  const workoutItems = Array.isArray((parsed as { workouts?: unknown }).workouts)
    ? (parsed as { workouts: unknown[] }).workouts
    : [];

  const mealMap = new Map<string, Record<string, unknown>>();
  for (const item of mealItems) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.date === "string") {
      mealMap.set(record.date, record);
    }
  }

  const workoutMap = new Map<string, Record<string, unknown>>();
  for (const item of workoutItems) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.date === "string") {
      workoutMap.set(record.date, record);
    }
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

const hasPlanContent = (plans: { meals: MealPlan[]; workouts: WorkoutPlan[] }) => {
  const mealContent = plans.meals.some((meal) =>
    [meal.breakfast, meal.lunch, meal.dinner, meal.snacks, meal.notes].some(
      (value) => value !== null
    )
  );
  const workoutContent = plans.workouts.some((workout) =>
    [
      workout.cardio,
      workout.strength,
      workout.intensity,
      workout.notes,
      workout.duration_min,
    ].some((value) => value !== null)
  );
  return mealContent || workoutContent;
};

const deleteWeekPlan = async (
  supabase: { from: (table: string) => any },
  table: "meal_week_plans" | "workout_week_plans",
  id: string,
  userId: string
) => {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    console.warn("Failed to cleanup week plan", { table, id, userId });
  }
};

export async function POST(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.HEALTH_CRON_SECRET;

  if (!cronSecret || !expectedSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { weekStart?: string; timezone?: string };
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { weekStart, timezone } = body;

  if (typeof weekStart !== "string" || !parseIsoDate(weekStart)) {
    return NextResponse.json(
      { error: "Missing or invalid weekStart" },
      { status: 400 }
    );
  }

  if (!timezone || typeof timezone !== "string" || !isValidTimezone(timezone)) {
    return NextResponse.json(
      { error: "Missing or invalid timezone" },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase service role configuration" },
      { status: 500 }
    );
  }

  const models = createHealthChatModels({ temperature: 0 });
  if (!models) {
    return NextResponse.json({ error: "Missing LLM configuration" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: metricsRows, error: metricsError } = await supabase
    .from("body_metrics")
    .select(
      "user_id,height_cm,weight_kg,gender,age,body_fat_pct,muscle_pct,subcutaneous_fat,visceral_fat,bmi,water_pct,protein_pct,bone_mass,bmr"
    );

  if (metricsError) {
    return NextResponse.json(
      { error: "Failed to load body metrics" },
      { status: 500 }
    );
  }

  const users = metricsRows ?? [];
  if (users.length === 0) {
    return NextResponse.json({ ok: true, generatedCount: 0 });
  }

  const userIds = users
    .map((row) => (row as { user_id?: unknown }).user_id)
    .filter((id): id is string => typeof id === "string" && !!id);

  const goalByUserId = new Map<string, string>();
  if (userIds.length) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id,health_goal")
      .in("id", userIds);

    (profileRows ?? []).forEach((row) => {
      const record = row as { id?: unknown; health_goal?: unknown };
      if (typeof record.id !== "string") return;
      const normalized = normalizeHealthGoal(record.health_goal);
      goalByUserId.set(record.id, normalized ?? DEFAULT_HEALTH_GOAL);
    });
  }

  const weekStartDate = parseIsoDate(weekStart)!;
  const days = buildWeekDays(weekStartDate);

  let generatedCount = 0;

  for (const user of users) {
    const userRecord = user as Record<string, unknown>;
    const userId = userRecord.user_id as string | undefined;
    if (!userId) {
      console.warn("Skipping body metrics row without user_id");
      continue;
    }

    const goal = normalizeHealthGoal(goalByUserId.get(userId)) ?? DEFAULT_HEALTH_GOAL;

    const systemPrompt =
      "你是健康计划助手。只返回 JSON，不要 markdown。所有字段值必须使用简体中文（不要英文）。";
    const { user_id: _, ...metricsForPrompt } = userRecord;
    const userPrompt = `请生成一个简单的 7 天游饮食与训练计划。\n${healthGoalToPrompt(goal)}\n周起始日：${weekStart}\n时区：${timezone}\n日期：${days.join(", ")}\n用户指标：${JSON.stringify(metricsForPrompt)}\n\n只返回 JSON，根节点包含 keys：meals 和 workouts。\n- meals：长度为 7 的数组，每项包含 date, breakfast, lunch, dinner, snacks, notes。\n- workouts：长度为 7 的数组，每项包含 date, cardio, strength, duration_min, intensity, notes。\n\n要求：\n- 除 date 外，所有文本必须是简体中文；不要输出英文。\n- 文本尽量短、可执行（像真实菜单/训练安排）。\n- 休息日相关字段用 null。\n- duration_min 必须是整数或 null。`;

    let responseContent: unknown;
    try {
      const response = await models.primary.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);
      responseContent = response.content;
    } catch (error) {
      if (models.fallback) {
        try {
          const response = await models.fallback.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPrompt),
          ]);
          responseContent = response.content;
        } catch (fallbackError) {
          console.warn("Skipping user due to LLM failure", {
            userId,
            primary: error instanceof Error ? error.message : String(error),
            fallback: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          });
          continue;
        }
      } else {
        console.warn("Skipping user due to LLM failure", {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
    }

    const content = normalizeContent(responseContent);
    if (!content) {
      console.warn("Skipping user due to empty LLM response", { userId });
      continue;
    }

    const parsedPlans = parsePlans(content, days);
    if (!parsedPlans) {
      console.warn("Skipping user due to invalid LLM response", { userId });
      continue;
    }
    const { meals, workouts } = parsedPlans;

    if (!hasPlanContent(parsedPlans)) {
      console.warn("Skipping user due to empty plan output", { userId });
      continue;
    }

    const { data: existingMealWeek } = await supabase
      .from("meal_week_plans")
      .select("id")
      .eq("user_id", userId)
      .eq("week_start_date", weekStart)
      .maybeSingle();

    const { data: existingWorkoutWeek } = await supabase
      .from("workout_week_plans")
      .select("id")
      .eq("user_id", userId)
      .eq("week_start_date", weekStart)
      .maybeSingle();

    const mealWeekWasCreated = !existingMealWeek?.id;
    const workoutWeekWasCreated = !existingWorkoutWeek?.id;

    const { data: mealWeek, error: mealWeekError } = await supabase
      .from("meal_week_plans")
      .upsert(
        {
          user_id: userId,
          week_start_date: weekStart,
          timezone,
          generated_by: "cron",
        },
        { onConflict: "user_id,week_start_date" }
      )
      .select("id")
      .single();

    if (mealWeekError || !mealWeek) {
      console.warn("Skipping user due to meal week upsert failure", { userId });
      continue;
    }

    const { data: workoutWeek, error: workoutWeekError } = await supabase
      .from("workout_week_plans")
      .upsert(
        {
          user_id: userId,
          week_start_date: weekStart,
          timezone,
          generated_by: "cron",
        },
        { onConflict: "user_id,week_start_date" }
      )
      .select("id")
      .single();

    if (workoutWeekError || !workoutWeek) {
      if (mealWeekWasCreated) {
        await deleteWeekPlan(supabase, "meal_week_plans", mealWeek.id, userId);
      }
      console.warn("Skipping user due to workout week upsert failure", { userId });
      continue;
    }

    const mealDayRows = meals.map((meal) => ({
      week_plan_id: mealWeek.id,
      date: meal.date,
      breakfast: meal.breakfast,
      lunch: meal.lunch,
      dinner: meal.dinner,
      snacks: meal.snacks,
      notes: meal.notes,
    }));

    const { error: mealDayError } = await supabase
      .from("meal_day_plans")
      .upsert(mealDayRows, { onConflict: "week_plan_id,date" });

    if (mealDayError) {
      if (mealWeekWasCreated) {
        await deleteWeekPlan(supabase, "meal_week_plans", mealWeek.id, userId);
      }
      if (workoutWeekWasCreated) {
        await deleteWeekPlan(
          supabase,
          "workout_week_plans",
          workoutWeek.id,
          userId
        );
      }
      console.warn("Skipping user due to meal day upsert failure", { userId });
      continue;
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

    const { error: workoutDayError } = await supabase
      .from("workout_day_plans")
      .upsert(workoutDayRows, { onConflict: "week_plan_id,date" });

    if (workoutDayError) {
      if (workoutWeekWasCreated) {
        await deleteWeekPlan(
          supabase,
          "workout_week_plans",
          workoutWeek.id,
          userId
        );
      }
      if (mealWeekWasCreated) {
        await deleteWeekPlan(supabase, "meal_week_plans", mealWeek.id, userId);
      }
      console.warn("Skipping user due to workout day upsert failure", { userId });
      continue;
    }

    generatedCount += 1;
  }

  return NextResponse.json({ ok: true, generatedCount });
}
