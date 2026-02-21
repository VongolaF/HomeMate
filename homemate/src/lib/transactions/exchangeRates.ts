import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getExchangeRate(
  rateDate: string,
  fromCurrency: string,
  toCurrency: string
) {
  if (fromCurrency === toCurrency) return 1;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("rate_date", rateDate)
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .order("rate_date", { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return Number(data.rate);
}
