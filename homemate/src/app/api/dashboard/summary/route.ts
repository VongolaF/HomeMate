import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/apiAuth";

function toDateString(year: number, month: number, day: number) {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startDate = toDateString(year, month, 1);
  const endDate = toDateString(year, month, lastDay);

  const { data: txRows, error: txError } = await auth.supabase
    .from("transactions")
    .select("amount_base,type")
    .eq("user_id", auth.user.id)
    .gte("occurred_at", startDate)
    .lte("occurred_at", endDate);

  if (txError) {
    return NextResponse.json(
      { error: "Failed to load dashboard summary" },
      { status: 500 }
    );
  }

  const { data: goalRows, error: goalError } = await auth.supabase
    .from("savings_goals")
    .select("target_amount,current_amount")
    .eq("user_id", auth.user.id);

  if (goalError) {
    return NextResponse.json(
      { error: "Failed to load savings goals" },
      { status: 500 }
    );
  }

  let monthIncome = 0;
  let monthExpense = 0;

  (txRows ?? []).forEach((row) => {
    const amount = Number(row.amount_base ?? 0);
    if (row.type === "income") monthIncome += amount;
    if (row.type === "expense") monthExpense += amount;
  });

  const savingsRate = monthIncome > 0 ? (monthIncome - monthExpense) / monthIncome : 0;

  let targetTotal = 0;
  let currentTotal = 0;
  (goalRows ?? []).forEach((row) => {
    targetTotal += Number(row.target_amount ?? 0);
    currentTotal += Number(row.current_amount ?? 0);
  });

  const goalsProgress = targetTotal > 0 ? currentTotal / targetTotal : 0;

  return NextResponse.json({
    data: {
      monthIncome,
      monthExpense,
      balance: monthIncome - monthExpense,
      savingsRate: Number(savingsRate.toFixed(4)),
      goalsProgress: Number(goalsProgress.toFixed(4)),
      month: `${year}-${String(month).padStart(2, "0")}`,
    },
  });
}
