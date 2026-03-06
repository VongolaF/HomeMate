import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/apiAuth";

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
