import { NextResponse } from "next/server";

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createClient } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createHealthChatModel } from "@/lib/health/llm";

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

  let body: { weekStart?: string; timezone?: string };

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

  if (!metricsRow) {
    return NextResponse.json(
      { error: "Missing body metrics. Please fill your profile metrics first." },
      { status: 400 }
    );
  }

  const weekStartDate = parseIsoDate(weekStart)!;
  const days = buildWeekDays(weekStartDate);

  const { user_id: userIdForPrompt, ...metricsForPrompt } = metricsRow as Record<
    string,
    unknown
  >;
  void userIdForPrompt;

  const systemPrompt = "You are a health planning assistant. Return JSON only, no markdown.";
  const userPrompt = `Create a simple 7-day meal and workout plan.\nWeek start: ${weekStart}\nTimezone: ${timezone}\nDates: ${days.join(", ")}\nUser metrics: ${JSON.stringify(metricsForPrompt)}\nReturn JSON with keys meals and workouts.\nMeals: array of 7 items with date, breakfast, lunch, dinner, snacks, notes.\nWorkouts: array of 7 items with date, cardio, strength, duration_min, intensity, notes.\nUse short plain text. Use null for rest day fields. Duration_min should be an integer or null.`;

  let responseContent: unknown;
  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);
    responseContent = response.content;
  } catch {
    return NextResponse.json({ error: "LLM request failed" }, { status: 502 });
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
