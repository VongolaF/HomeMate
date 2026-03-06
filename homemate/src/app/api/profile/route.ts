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
