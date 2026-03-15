import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/apiAuth";
import { normalizeGoalPayload } from "@/lib/mobile/apiPayloads";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("savings_goals")
    .select("id,title,target_amount,current_amount,deadline,rule_amount")
    .eq("user_id", auth.user.id)
    .order("deadline", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load savings goals" },
      { status: 500 }
    );
  }

  const items = (data ?? []).map((row) => {
    const target = Number(row.target_amount ?? 0);
    const current = Number(row.current_amount ?? 0);
    const progressPct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

    return {
      id: row.id,
      name: row.title,
      title: row.title,
      target,
      current,
      deadline: row.deadline,
      ruleAmount: Number(row.rule_amount ?? 0),
      progressPct: Number(progressPct.toFixed(2)),
    };
  });

  return NextResponse.json({ data: { items } });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  let payload: ReturnType<typeof normalizeGoalPayload>;
  try {
    payload = normalizeGoalPayload(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { data, error } = await auth.supabase
    .from("savings_goals")
    .insert({
      user_id: auth.user.id,
      title: payload.title,
      target_amount: payload.target,
      current_amount: payload.current,
      deadline: payload.deadline,
      rule_amount: payload.ruleAmount,
    })
    .select("id,title,target_amount,current_amount,deadline,rule_amount")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create savings goal" }, { status: 500 });
  }

  const target = Number(data.target_amount ?? 0);
  const current = Number(data.current_amount ?? 0);
  return NextResponse.json({
    data: {
      item: {
        id: data.id,
        name: data.title,
        title: data.title,
        target,
        current,
        deadline: data.deadline,
        ruleAmount: Number(data.rule_amount ?? 0),
        progressPct: target > 0 ? Number(Math.min(100, (current / target) * 100).toFixed(2)) : 0,
      },
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Missing goal id" }, { status: 400 });
  }

  let payload: ReturnType<typeof normalizeGoalPayload>;
  try {
    payload = normalizeGoalPayload(body);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { data, error } = await auth.supabase
    .from("savings_goals")
    .update({
      title: payload.title,
      target_amount: payload.target,
      current_amount: payload.current,
      deadline: payload.deadline,
      rule_amount: payload.ruleAmount,
    })
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id,title,target_amount,current_amount,deadline,rule_amount")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to update savings goal" }, { status: 500 });
  }

  const target = Number(data.target_amount ?? 0);
  const current = Number(data.current_amount ?? 0);
  return NextResponse.json({
    data: {
      item: {
        id: data.id,
        name: data.title,
        title: data.title,
        target,
        current,
        deadline: data.deadline,
        ruleAmount: Number(data.rule_amount ?? 0),
        progressPct: target > 0 ? Number(Math.min(100, (current / target) * 100).toFixed(2)) : 0,
      },
    },
  });
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Missing goal id" }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("savings_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete savings goal" }, { status: 500 });
  }

  return NextResponse.json({ data: { id } });
}
