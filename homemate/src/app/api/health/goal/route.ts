import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/apiAuth";
import { normalizeHealthGoalPayload } from "@/lib/mobile/apiPayloads";

export async function PATCH(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  let payload: ReturnType<typeof normalizeHealthGoalPayload>;
  try {
    payload = normalizeHealthGoalPayload(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { error } = await auth.supabase
    .from("profiles")
    .update({ health_goal: payload.healthGoal })
    .eq("id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update health goal" }, { status: 500 });
  }

  return NextResponse.json({ data: { healthGoal: payload.healthGoal } });
}
