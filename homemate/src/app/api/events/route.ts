import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/apiAuth";
import { normalizeReminderPayload } from "@/lib/mobile/apiPayloads";

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
    .select("id,title,description,event_date,status,priority")
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
    priority: row.priority ?? "medium",
  }));

  return NextResponse.json({ data: { month, items } });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  let payload: ReturnType<typeof normalizeReminderPayload>;
  try {
    payload = normalizeReminderPayload(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { data, error } = await auth.supabase
    .from("events")
    .insert({
      user_id: auth.user.id,
      title: payload.title,
      event_date: payload.eventDate,
      description: payload.description,
      priority: payload.priority,
      status: payload.status,
    })
    .select("id,title,description,event_date,status,priority")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      item: {
        id: data.id,
        date: data.event_date,
        title: data.title,
        description: data.description ?? "",
        status: data.status ?? "open",
        priority: data.priority ?? "medium",
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
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  let payload: ReturnType<typeof normalizeReminderPayload>;
  try {
    payload = normalizeReminderPayload(body);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { data, error } = await auth.supabase
    .from("events")
    .update({
      title: payload.title,
      event_date: payload.eventDate,
      description: payload.description,
      priority: payload.priority,
      status: payload.status,
    })
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id,title,description,event_date,status,priority")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      item: {
        id: data.id,
        date: data.event_date,
        title: data.title,
        description: data.description ?? "",
        status: data.status ?? "open",
        priority: data.priority ?? "medium",
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
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }

  return NextResponse.json({ data: { id } });
}
