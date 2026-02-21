"use server";

import { listTransactions, upsertTransaction, deleteTransaction } from "@/lib/transactions/transactions";
import { listUserCategories } from "@/lib/transactions/categories";
import { getExchangeRate } from "@/lib/transactions/exchangeRates";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getTransactionsData(filters: unknown) {
  const [transactions, categories] = await Promise.all([
    listTransactions(filters ?? {}),
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
  const supabase = createSupabaseServerClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("base_currency")
    .single();

  if (profileError) throw profileError;

  const rate = await getExchangeRate(input.occurred_at, input.currency, profile.base_currency);
  const amount_base = rate ? Number(input.amount) * Number(rate) : Number(input.amount);

  const transaction = await upsertTransaction({ ...input, amount_base });
  return { transaction, rateMissing: rate === null };
}

export async function removeTransaction(id: string) {
  return deleteTransaction(id);
}
