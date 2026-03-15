import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/apiAuth";
import { normalizeTransactionPayload } from "@/lib/mobile/apiPayloads";

type TransactionRow = {
  id: string;
  type: "income" | "expense";
  amount: number;
  amount_base: number;
  currency: string;
  occurred_at: string;
  note: string | null;
  category_id: string | null;
  category?: { name?: string } | Array<{ name?: string }> | null;
};

function mapTransaction(row: TransactionRow) {
  const categorySource = Array.isArray(row.category)
    ? row.category[0]
    : row.category;
  const categoryName = categorySource?.name || "未分类";

  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount_base ?? row.amount ?? 0),
    amountBase: Number(row.amount_base ?? 0),
    originalAmount: Number(row.amount ?? 0),
    currency: row.currency,
    date: row.occurred_at,
    occurredAt: row.occurred_at,
    categoryId: row.category_id,
    category: categoryName,
    title: categoryName,
    note: row.note,
  };
}

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate")?.trim() || null;
  const endDate = url.searchParams.get("endDate")?.trim() || null;
  const type = url.searchParams.get("type")?.trim() || null;
  const categoryId = url.searchParams.get("categoryId")?.trim() || null;
  const categoryIdsParam = url.searchParams.get("categoryIds")?.trim() || "";
  const categoryIds = categoryIdsParam
    ? categoryIdsParam
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  let query = auth.supabase
    .from("transactions")
    .select(
      "id,type,amount,amount_base,currency,occurred_at,note,category_id,category:user_categories(name)"
    )
    .eq("user_id", auth.user.id)
    .order("occurred_at", { ascending: false });

  if (startDate) query = query.gte("occurred_at", startDate);
  if (endDate) query = query.lte("occurred_at", endDate);
  if (type === "income" || type === "expense") query = query.eq("type", type);
  if (categoryIds.length > 0) {
    query = query.in("category_id", categoryIds);
  } else if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to load transactions" },
      { status: 500 }
    );
  }

  const items = ((data ?? []) as TransactionRow[]).map(mapTransaction);

  return NextResponse.json({ data: { items } });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  let payload: ReturnType<typeof normalizeTransactionPayload>;
  try {
    payload = normalizeTransactionPayload(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { data, error } = await auth.supabase
    .from("transactions")
    .insert({
      user_id: auth.user.id,
      type: payload.type,
      amount: payload.amount,
      amount_base: payload.amount,
      currency: payload.currency,
      occurred_at: payload.occurredAt,
      category_id: payload.categoryId,
      note: payload.note,
      tags: [],
    })
    .select(
      "id,type,amount,amount_base,currency,occurred_at,note,category_id,category:user_categories(name)"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { item: mapTransaction(data as TransactionRow) } });
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
    return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
  }

  let payload: ReturnType<typeof normalizeTransactionPayload>;
  try {
    payload = normalizeTransactionPayload(body);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { data, error } = await auth.supabase
    .from("transactions")
    .update({
      type: payload.type,
      amount: payload.amount,
      amount_base: payload.amount,
      currency: payload.currency,
      occurred_at: payload.occurredAt,
      category_id: payload.categoryId,
      note: payload.note,
    })
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select(
      "id,type,amount,amount_base,currency,occurred_at,note,category_id,category:user_categories(name)"
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { item: mapTransaction(data as TransactionRow) } });
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
    return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id } });
}
