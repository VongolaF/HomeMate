import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/apiAuth";

type TxRow = {
  amount_base: number;
  type: "income" | "expense";
  occurred_at: string;
  category_id: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
};

function toDateString(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const now = new Date();
  const year = now.getUTCFullYear();
  const startDate = toDateString(year, 1, 1);
  const endDate = toDateString(year, 12, 31);

  const [txRes, categoryRes] = await Promise.all([
    auth.supabase
      .from("transactions")
      .select("amount_base,type,occurred_at,category_id")
      .eq("user_id", auth.user.id)
      .gte("occurred_at", startDate)
      .lte("occurred_at", endDate),
    auth.supabase
      .from("user_categories")
      .select("id,name")
      .eq("user_id", auth.user.id)
      .eq("type", "expense"),
  ]);

  if (txRes.error || categoryRes.error) {
    return NextResponse.json(
      { error: "Failed to load analytics overview" },
      { status: 500 }
    );
  }

  const txRows = (txRes.data ?? []) as TxRow[];
  const categories = (categoryRes.data ?? []) as CategoryRow[];
  const categoryMap = new Map(categories.map((row) => [row.id, row.name]));

  let totalIncome = 0;
  let totalExpense = 0;
  const monthlyIncome = Array.from({ length: 12 }, () => 0);
  const monthlyExpense = Array.from({ length: 12 }, () => 0);
  const expenseMap = new Map<string, number>();

  txRows.forEach((row) => {
    const amount = Number(row.amount_base ?? 0);
    const monthIndex = Math.max(0, Math.min(11, Number(row.occurred_at.slice(5, 7)) - 1));

    if (row.type === "income") {
      totalIncome += amount;
      monthlyIncome[monthIndex] += amount;
      return;
    }

    totalExpense += amount;
    monthlyExpense[monthIndex] += amount;
    const categoryName = row.category_id
      ? categoryMap.get(row.category_id) || "未分类"
      : "未分类";
    expenseMap.set(categoryName, (expenseMap.get(categoryName) ?? 0) + amount);
  });

  const monthly = Array.from({ length: 12 }, (_, index) => ({
    month: `${index + 1}月`,
    income: Number(monthlyIncome[index].toFixed(2)),
    expense: Number(monthlyExpense[index].toFixed(2)),
  }));

  const topExpense = Array.from(expenseMap.entries())
    .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return NextResponse.json({
    data: {
      year,
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      monthly,
      topExpense,
      expenseTop: topExpense,
    },
  });
}
