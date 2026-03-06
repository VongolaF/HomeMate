import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/apiAuth";

const MONTH_REGEX = /^\d{4}-\d{2}$/;

function getMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const startDate = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(monthNumber).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const monthParam = url.searchParams.get("month")?.trim();
  const now = new Date();
  const fallbackMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const month = monthParam && MONTH_REGEX.test(monthParam) ? monthParam : fallbackMonth;

  const { startDate, endDate } = getMonthRange(month);

  const { data, error } = await auth.supabase
    .from("events")
    .select("id,title,description,event_date,status")
    .eq("user_id", auth.user.id)
    .gte("event_date", startDate)
    .lte("event_date", endDate)
    .order("event_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
  }

  const items = (data ?? []).map((row) => ({
    id: row.id,
    date: row.event_date,
    title: row.title,
    description: row.description ?? "",
    status: row.status ?? "open",
  }));

  return NextResponse.json({ data: { month, items } });
}
