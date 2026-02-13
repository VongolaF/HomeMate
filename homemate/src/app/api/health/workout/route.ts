import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const WEEK_START_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient(request);
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = new URL(request.url).searchParams.get("weekStart");

  if (!weekStart || !WEEK_START_REGEX.test(weekStart)) {
    return NextResponse.json(
      { error: "Missing or invalid weekStart" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("workout_week_plans")
    .select("*, workout_day_plans(*)")
    .eq("user_id", userData.user.id)
    .eq("week_start_date", weekStart)
    .order("date", { ascending: true, foreignTable: "workout_day_plans" })
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to load workout plan" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ weekPlan: null, dayPlans: [] });
  }

  const { workout_day_plans: dayPlans, ...weekPlan } = data;

  return NextResponse.json({ weekPlan, dayPlans: dayPlans ?? [] });
}
