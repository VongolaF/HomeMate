import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getExchangeRate(
  rateDate: string,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  if (fromCurrency === toCurrency) return 1;

  const dateOnly = rateDate.split("T")[0];

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("rate_date", dateOnly)
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const rate = Number(data.rate);
  return Number.isFinite(rate) ? rate : null;
}
