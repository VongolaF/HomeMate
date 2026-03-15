import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/apiAuth";
import { normalizeSavingsContributionPayload } from "@/lib/mobile/apiPayloads";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const goalId = new URL(request.url).searchParams.get("goalId")?.trim() || "";
  if (!goalId) {
    return NextResponse.json({ error: "Missing goalId" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("savings_contributions")
    .select("id,goal_id,amount,contributed_at,source")
    .eq("goal_id", goalId)
    .order("contributed_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load contributions" }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      items: (data ?? []).map((row) => ({
        id: row.id,
        goalId: row.goal_id,
        amount: Number(row.amount ?? 0),
        contributedAt: row.contributed_at,
        source: row.source ?? "manual",
      })),
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  let payload: ReturnType<typeof normalizeSavingsContributionPayload>;
  try {
    payload = normalizeSavingsContributionPayload(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { data: goal, error: goalError } = await auth.supabase
    .from("savings_goals")
    .select("id,current_amount")
    .eq("id", payload.goalId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (goalError || !goal) {
    return NextResponse.json({ error: "Savings goal not found" }, { status: 404 });
  }

  const { data, error } = await auth.supabase
    .from("savings_contributions")
    .insert({
      goal_id: payload.goalId,
      amount: payload.amount,
      contributed_at: payload.contributedAt,
      source: "manual",
    })
    .select("id,goal_id,amount,contributed_at,source")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to save contribution" }, { status: 500 });
  }

  const nextCurrent = Number(goal.current_amount ?? 0) + payload.amount;
  await auth.supabase
    .from("savings_goals")
    .update({ current_amount: nextCurrent })
    .eq("id", payload.goalId)
    .eq("user_id", auth.user.id);

  return NextResponse.json({
    data: {
      item: {
        id: data.id,
        goalId: data.goal_id,
        amount: Number(data.amount ?? 0),
        contributedAt: data.contributed_at,
        source: data.source ?? "manual",
      },
      currentAmount: nextCurrent,
    },
  });
}
