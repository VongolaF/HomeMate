"use client";

import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

function formatPercent(value: number | null) {
  if (value === null) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function safeRatio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

interface BalanceRateCardsProps {
  selectedYear: Dayjs;
}

export default function BalanceRateCards({ selectedYear }: BalanceRateCardsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [yearIncome, setYearIncome] = useState(0);
  const [yearExpense, setYearExpense] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const monthStart = dayjs().startOf("month").format("YYYY-MM-DD");
      const monthEnd = dayjs().endOf("month").format("YYYY-MM-DD");
      const yearStart = selectedYear.startOf("year").format("YYYY-MM-DD");
      const yearEnd = selectedYear.endOf("year").format("YYYY-MM-DD");

      const [monthRes, yearRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("amount_base,type,occurred_at")
          .gte("occurred_at", monthStart)
          .lte("occurred_at", monthEnd),
        supabase
          .from("transactions")
          .select("amount_base,type,occurred_at")
          .gte("occurred_at", yearStart)
          .lte("occurred_at", yearEnd),
      ]);

      if (!isMounted) return;
      if (monthRes.error || yearRes.error || !monthRes.data || !yearRes.data) {
        setError("加载没成功");
        setLoading(false);
        return;
      }

      let mIncome = 0;
      let mExpense = 0;
      monthRes.data.forEach((row) => {
        const amount = Number(row.amount_base || 0);
        if (row.type === "income") mIncome += amount;
        else mExpense += amount;
      });

      let yIncome = 0;
      let yExpense = 0;
      yearRes.data.forEach((row) => {
        const amount = Number(row.amount_base || 0);
        if (row.type === "income") yIncome += amount;
        else yExpense += amount;
      });

      setMonthIncome(mIncome);
      setMonthExpense(mExpense);
      setYearIncome(yIncome);
      setYearExpense(yExpense);
      setLoading(false);
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  const monthRate = useMemo(
    () => safeRatio(monthIncome - monthExpense, monthIncome),
    [monthExpense, monthIncome]
  );

  const yearRate = useMemo(
    () => safeRatio(yearIncome - yearExpense, yearIncome),
    [yearExpense, yearIncome]
  );

  return (
    <section className="rounded-2xl border-2 border-line bg-panel p-4 shadow-soft" style={{ gridColumn: "1 / -1" }}>
      <h3 className="mb-3 text-base font-semibold text-ink">结余率</h3>
      {loading ? <p className="text-sm text-muted">加载中...</p> : null}
      {!loading && error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}
      {!loading && !error ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-white/80 p-3">
            <p className="text-sm text-muted">当月结余率</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{formatPercent(monthRate)}</p>
            <p className="text-sm text-muted">收入 ¥{monthIncome.toFixed(2)} / 支出 ¥{monthExpense.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-line bg-white/80 p-3">
            <p className="text-sm text-muted">{selectedYear.year()} 年平均结余率</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{formatPercent(yearRate)}</p>
            <p className="text-sm text-muted">收入 ¥{yearIncome.toFixed(2)} / 支出 ¥{yearExpense.toFixed(2)}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
