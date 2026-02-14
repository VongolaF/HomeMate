import {
  createSupabaseServerClient,
  createSupabaseServerReadClient,
} from "@/lib/supabase/server";
import type { UserCategory } from "@/types/transactions";

export async function listUserCategories(options: { includeInactive?: boolean } = {}) {
  const supabase = createSupabaseServerReadClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;

  const userId = userData.user?.id;

  if (!userId) {
    throw new Error("Authenticated user required to list categories.");
  }

  let query = supabase
    .from("user_categories")
    .select("*")
    .order("sort_order", { ascending: true });
    .eq("user_id", userId);

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
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = data.user?.id;

  if (!userId) {
    throw new Error("Authenticated user required to deactivate category.");
  }

  const { error } = await supabase
    .from("user_categories")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}
