import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getExchangeRate(
  rateDate: string,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  if (fromCurrency === toCurrency) return 1;

  const dateOnly = rateDate.split("T")[0];
  const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateOnly);
  if (!isValidFormat) return null;

  const parsedDate = new Date(`${dateOnly}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) return null;
  if (parsedDate.toISOString().slice(0, 10) !== dateOnly) return null;

  const supabase = await createSupabaseServerClient();
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
