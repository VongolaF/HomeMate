import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { normalizeRefreshPayload } from "@/lib/mobile/apiPayloads";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Missing Supabase environment configuration" },
      { status: 500 }
    );
  }

  let payload: ReturnType<typeof normalizeRefreshPayload>;
  try {
    payload = normalizeRefreshPayload(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON body" },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: payload.refreshToken,
  });

  if (error || !data.session || !data.user) {
    return NextResponse.json({ error: error?.message || "Unauthorized" }, { status: 401 });
  }

  const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    typeof metadata.display_name === "string"
      ? metadata.display_name
      : typeof metadata.username === "string"
        ? metadata.username
        : data.user.email?.split("@")[0] ?? "HomeMate 用户";

  return NextResponse.json({
    data: {
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
        phone: data.user.phone ?? null,
        name: displayName,
      },
    },
  });
}
