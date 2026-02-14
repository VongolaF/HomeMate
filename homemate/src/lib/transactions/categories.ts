import {
  createSupabaseServerClient,
  createSupabaseServerReadClient,
} from "@/lib/supabase/server";
import type { UserCategory } from "@/types/transactions";

export async function listUserCategories(options: { includeInactive?: boolean } = {}) {
  const supabase = createSupabaseServerReadClient();
  let query = supabase
    .from("user_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (!options.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as UserCategory[];
}

export async function upsertUserCategory(input: Partial<UserCategory>) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data.user?.id;

  if (!userId) {
    throw new Error("Authenticated user required to upsert category.");
  }

  const { data, error } = await supabase
    .from("user_categories")
    .upsert({ ...input, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data as UserCategory;
}

export async function deactivateUserCategory(id: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("user_categories")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}
