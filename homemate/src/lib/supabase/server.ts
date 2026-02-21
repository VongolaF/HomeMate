import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
	const cookieStore = await cookies();

	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				get(name) {
					return cookieStore.get(name)?.value;
				},
				set(name, value, options) {
					try {
						cookieStore.set({ name, value, ...options });
					} catch {
						// Ignore cookie mutation errors outside actions/handlers.
					}
				},
				remove(name, options) {
					try {
						cookieStore.set({ name, value: "", ...options });
					} catch {
						// Ignore cookie mutation errors outside actions/handlers.
					}
				},
			},
		}
	);
}

export async function createSupabaseServerReadClient() {
	const cookieStore = await cookies();

	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				get(name) {
					return cookieStore.get(name)?.value;
				},
				set() {},
				remove() {},
			},
		}
	);
}
