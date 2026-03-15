import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { normalizeRegisterPayload } from "@/lib/mobile/apiPayloads";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Missing Supabase environment configuration" },
      { status: 500 }
    );
  }

  let payload: ReturnType<typeof normalizeRegisterPayload>;
  try {
    payload = normalizeRegisterPayload(await request.json());
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

  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        username: payload.username,
        display_name: payload.displayName,
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message || "Register failed" }, { status: 400 });
  }

  const session = data.session;
  const user = data.user;

  return NextResponse.json({
    data: {
      created: true,
      requiresLogin: !session,
      token: session?.access_token ?? null,
      refreshToken: session?.refresh_token ?? null,
      expiresAt: session?.expires_at ?? null,
      user: user
        ? {
            id: user.id,
            email: user.email ?? payload.email,
            phone: user.phone ?? null,
            name: payload.displayName ?? payload.username,
          }
        : null,
    },
  });
}
