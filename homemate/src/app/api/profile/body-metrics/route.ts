import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/apiAuth";
import { normalizeBodyMetricsPayload } from "@/lib/mobile/apiPayloads";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("body_metrics")
    .select(
      "user_id,height_cm,weight_kg,gender,birthday,age,body_fat_pct,muscle_pct,subcutaneous_fat,visceral_fat,bmi,water_pct,protein_pct,bone_mass,bmr"
    )
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load body metrics" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? null });
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  let payload: ReturnType<typeof normalizeBodyMetricsPayload>;
  try {
    payload = normalizeBodyMetricsPayload(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON body" },
      { status: 400 }
    );
  }

  const upsertPayload = {
    user_id: auth.user.id,
    ...payload,
  } as Record<string, unknown>;

  const { data, error } = await auth.supabase
    .from("body_metrics")
    .upsert(upsertPayload)
    .select(
      "user_id,height_cm,weight_kg,gender,birthday,age,body_fat_pct,muscle_pct,subcutaneous_fat,visceral_fat,bmi,water_pct,protein_pct,bone_mass,bmr"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update body metrics" }, { status: 500 });
  }

  return NextResponse.json({ data });
}
