import { NextResponse } from "next/server";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type AuthSuccess = {
  supabase: SupabaseClient;
  user: User;
};

type AuthFailure = {
  response: NextResponse;
};

export async function requireApiUser(
  request: Request
): Promise<AuthSuccess | AuthFailure> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const supabase = createServerSupabaseClient(request);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    supabase,
    user: data.user,
  };
}
