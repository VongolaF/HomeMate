import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/apiAuth";

type ProfileRow = {
  display_name: string | null;
  username: string | null;
  base_currency: string | null;
  health_goal: string | null;
};

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.supabase
    .from("profiles")
    .select("display_name,username,base_currency,health_goal")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  const profile = (data ?? null) as ProfileRow | null;

  const name =
    profile?.display_name ||
    profile?.username ||
    auth.user.email?.split("@")[0] ||
    "HomeMate 用户";

  return NextResponse.json({
    data: {
      id: auth.user.id,
      name,
      email: auth.user.email ?? "",
      phone: auth.user.phone ?? "",
      currency: profile?.base_currency || "CNY",
      healthGoal: profile?.health_goal || "balanced",
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

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : null;
  const username = typeof body.username === "string" ? body.username.trim() : null;
  const phone = typeof body.phone === "string" ? body.phone.trim() : null;
  const baseCurrency =
    typeof body.baseCurrency === "string" && body.baseCurrency.trim()
      ? body.baseCurrency.trim().toUpperCase()
      : null;

  const { error } = await auth.supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      username: username || null,
      phone: phone || null,
      base_currency: baseCurrency || "CNY",
    })
    .eq("id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return GET(request);
}
