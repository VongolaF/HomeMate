import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/apiAuth";

const TYPE_SET = new Set(["income", "expense"]);

const parseBody = async (request: Request) => {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON body");
  }
};

const mapCategory = (row: Record<string, unknown>) => ({
  id: String(row.id ?? ""),
  name: String(row.name ?? ""),
  icon: typeof row.icon === "string" ? row.icon : null,
  type: String(row.type ?? "expense"),
  sortOrder: Number(row.sort_order ?? 0),
  isActive: Boolean(row.is_active ?? true),
});

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";

  let query = auth.supabase
    .from("user_categories")
    .select("id,name,icon,type,sort_order,is_active")
    .eq("user_id", auth.user.id)
    .order("type", { ascending: true })
    .order("sort_order", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }

  return NextResponse.json({ data: { items: (data ?? []).map((row) => mapCategory(row as Record<string, unknown>)) } });
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await parseBody(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type = typeof body.type === "string" ? body.type.trim() : "";

  if (!name) return NextResponse.json({ error: "Missing category name" }, { status: 400 });
  if (!TYPE_SET.has(type)) return NextResponse.json({ error: "Invalid category type" }, { status: 400 });

  const { data, error } = await auth.supabase
    .from("user_categories")
    .upsert({
      id: typeof body.id === "string" && body.id.trim() ? body.id.trim() : undefined,
      user_id: auth.user.id,
      name,
      icon: typeof body.icon === "string" ? body.icon.trim() || null : null,
      type,
      sort_order: typeof body.sortOrder === "number" ? body.sortOrder : Number(body.sortOrder ?? 0),
      is_active: body.isActive === false ? false : true,
    })
    .select("id,name,icon,type,sort_order,is_active")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to save category" }, { status: 500 });
  }

  return NextResponse.json({ data: { item: mapCategory(data as Record<string, unknown>) } });
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await parseBody(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid JSON body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "Missing category id" }, { status: 400 });

  const { error } = await auth.supabase
    .from("user_categories")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }

  return NextResponse.json({ data: { id } });
}
