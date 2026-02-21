import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Transaction } from "@/types/transactions";

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: "income" | "expense";
  categoryIds?: string[];
  minAmount?: number;
  maxAmount?: number;
  tags?: string[];
}

export async function listTransactions(filters: TransactionFilters = {}) {
  const supabase = createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;

  const userId = userData.user?.id;

  if (!userId) {
    throw new Error("Authenticated user required to list transactions.");
  }

  let query = supabase.from("transactions").select("*").eq("user_id", userId);

  if (filters.startDate) query = query.gte("occurred_at", filters.startDate);
  if (filters.endDate) query = query.lte("occurred_at", filters.endDate);
  if (filters.type) query = query.eq("type", filters.type);
  if (Array.isArray(filters.categoryIds) && filters.categoryIds.length) {
    query = query.in("category_id", filters.categoryIds);
  }
  if (filters.minAmount !== undefined) query = query.gte("amount_base", filters.minAmount);
  if (filters.maxAmount !== undefined) query = query.lte("amount_base", filters.maxAmount);
  if (Array.isArray(filters.tags) && filters.tags.length) {
    query = query.overlaps("tags", filters.tags);
  }

  const { data, error } = await query.order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function upsertTransaction(input: Partial<Transaction>) {
  const supabase = createSupabaseServerClient();
  const { data, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;

  const userId = data.user?.id;

  if (!userId) {
    throw new Error("Authenticated user required to upsert transaction.");
  }

  const { data: transaction, error } = await supabase
    .from("transactions")
    .upsert({ ...input, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return transaction as Transaction;
}

export async function deleteTransaction(id: string) {
  const supabase = createSupabaseServerClient();
  const { data, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;

  const userId = data.user?.id;

  if (!userId) {
    throw new Error("Authenticated user required to delete transaction.");
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}
