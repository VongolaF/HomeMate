"use server";

import { listTransactions, upsertTransaction, deleteTransaction } from "@/lib/transactions/transactions";
import {
  listUserCategories,
  upsertUserCategory,
  deactivateUserCategory,
} from "@/lib/transactions/categories";
import { getExchangeRate } from "@/lib/transactions/exchangeRates";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getTransactionsData(filters: unknown) {
  const safeFilters =
    typeof filters === "object" && filters !== null && !Array.isArray(filters) ? filters : {};
  const [transactions, categories] = await Promise.all([
    listTransactions(safeFilters),
    listUserCategories(),
  ]);

  return { transactions, categories };
}

export async function saveTransaction(input: {
  amount: number;
  currency: string;
  occurred_at: string;
  [key: string]: unknown;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("base_currency")
    .maybeSingle();

  if (profileError) throw profileError;

  const baseCurrency = profile?.base_currency ?? input.currency;

  const rate = await getExchangeRate(input.occurred_at, input.currency, baseCurrency);
  const amount_base = rate === null ? Number(input.amount) : Number(input.amount) * Number(rate);

  const transaction = await upsertTransaction({ ...input, amount_base });
  return { transaction, rateMissing: rate === null };
}

export async function removeTransaction(id: string) {
  return deleteTransaction(id);
}

export async function saveCategory(input: {
  id?: string;
  name: string;
  icon?: string | null;
  type: "income" | "expense";
  sort_order?: number;
  is_active?: boolean;
}) {
  return upsertUserCategory(input);
}

export async function disableCategory(categoryId: string) {
  return deactivateUserCategory(categoryId);
}
