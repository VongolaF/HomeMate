import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserCategory } from "@/types/transactions";

export async function listUserCategories() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as UserCategory[];
}

export async function upsertUserCategory(input: Partial<UserCategory>) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_categories")
    .upsert(input)
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
