import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const WORKOUT_FIELDS = [
  "cardio",
  "strength",
  "notes",
  "duration_min",
  "intensity",
];

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeDuration = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : value;
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

const isDateInWeek = (dateValue: string, weekStartValue: string) => {
  const date = parseIsoDate(dateValue);
  const weekStart = parseIsoDate(weekStartValue);
  if (!date || !weekStart) return false;
  const diffMs = date.getTime() - weekStart.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  return diffDays >= 0 && diffDays <= 6;
};

const isValidWorkoutValue = (key: string, value: unknown) => {
  if (value === null) return true;
  if (key === "duration_min") {
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      Number.isInteger(value) &&
      value > 0
    );
  }
  return typeof value === "string";
};

const buildUpdates = (updates: Record<string, unknown>) => {
  return WORKOUT_FIELDS.reduce<Record<string, unknown>>((accumulator, key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      const value = updates[key];
      if (value !== undefined) {
        accumulator[key] =
          key === "duration_min" ? normalizeDuration(value) : normalizeText(value);
      }
    }
    return accumulator;
  }, {});
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient(request);
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    date?: string;
    weekStart?: string;
    updates?: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { date, weekStart, updates } = body;

  if (!date || !parseIsoDate(date)) {
    return NextResponse.json(
      { error: "Missing or invalid date" },
      { status: 400 }
    );
  }

  if (!weekStart || !parseIsoDate(weekStart)) {
    return NextResponse.json(
      { error: "Missing or invalid weekStart" },
      { status: 400 }
    );
  }

  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    return NextResponse.json(
      { error: "Missing or invalid updates" },
      { status: 400 }
    );
  }

  const unknownFields = Object.keys(updates).filter(
    (key) => !WORKOUT_FIELDS.includes(key)
  );

  if (unknownFields.length > 0) {
    return NextResponse.json({ error: "Invalid update fields" }, { status: 400 });
  }

  const cleanedUpdates = buildUpdates(updates);

  if (Object.keys(cleanedUpdates).length === 0) {
    return NextResponse.json(
      { error: "Missing or invalid updates" },
      { status: 400 }
    );
  }

  if (!isDateInWeek(date, weekStart)) {
    return NextResponse.json(
      { error: "Date is outside the requested week" },
      { status: 400 }
    );
  }

  for (const [key, value] of Object.entries(cleanedUpdates)) {
    if (!WORKOUT_FIELDS.includes(key) || !isValidWorkoutValue(key, value)) {
      return NextResponse.json(
        { error: "Invalid update value" },
        { status: 400 }
      );
    }
  }

  const { data: weekPlanData, error: weekPlanError } = await supabase
    .from("workout_week_plans")
    .select("*, workout_day_plans(*)")
    .eq("user_id", userData.user.id)
    .eq("week_start_date", weekStart)
    .order("date", { ascending: true, foreignTable: "workout_day_plans" })
    .maybeSingle();

  if (weekPlanError) {
    return NextResponse.json(
      { error: "Failed to load workout plan" },
      { status: 500 }
    );
  }

  if (!weekPlanData) {
    return NextResponse.json({ error: "Week plan not found" }, { status: 404 });
  }

  const { error: upsertError } = await supabase
    .from("workout_day_plans")
    .upsert(
      {
        week_plan_id: weekPlanData.id,
        date,
        ...cleanedUpdates,
      },
      { onConflict: "week_plan_id,date" }
    );

  if (upsertError) {
    return NextResponse.json(
      { error: "Failed to update workout plan" },
      { status: 500 }
    );
  }

  const { data: updatedData, error: updatedError } = await supabase
    .from("workout_week_plans")
    .select("*, workout_day_plans(*)")
    .eq("user_id", userData.user.id)
    .eq("week_start_date", weekStart)
    .order("date", { ascending: true, foreignTable: "workout_day_plans" })
    .maybeSingle();

  if (updatedError) {
    return NextResponse.json(
      { error: "Failed to load updated workout plan" },
      { status: 500 }
    );
  }

  if (!updatedData) {
    return NextResponse.json({ error: "Week plan not found" }, { status: 404 });
  }

  const { workout_day_plans: dayPlans, ...weekPlan } = updatedData;

  return NextResponse.json({ weekPlan, dayPlans: dayPlans ?? [] });
}
