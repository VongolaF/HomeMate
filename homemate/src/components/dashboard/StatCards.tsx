"use client";

import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function StatCards() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expense, setExpense] = useState(0);
  const [income, setIncome] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const start = dayjs().startOf("month").format("YYYY-MM-DD");
      const end = dayjs().endOf("month").format("YYYY-MM-DD");

      const { data: rows, error: fetchError } = await supabase
        .from("transactions")
        .select("amount_base,type")
        .gte("occurred_at", start)
        .lte("occurred_at", end);

      if (!isMounted) return;
      if (fetchError || !rows) {
        setError("加载没成功");
        setLoading(false);
        return;
      }

      let expenseTotal = 0;
      let incomeTotal = 0;
      rows.forEach((row) => {
        const amount = Number(row.amount_base || 0);
        if (row.type === "expense") {
          expenseTotal += amount;
        } else {
          incomeTotal += amount;
        }
      });

      setExpense(expenseTotal);
      setIncome(incomeTotal);
      setLoading(false);
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const balance = useMemo(() => income - expense, [income, expense]);

  return (
    <section className="h-full rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <h3 className="mb-3 text-lg font-semibold text-ink">本月概览</h3>
      {loading ? (
        <p className="text-sm text-muted">加载中…</p>
      ) : error ? (
        <p className="text-sm text-red-600">加载没成功</p>
      ) : (
        <div className="grid gap-3">
          <div>
            <p className="mt-1 block text-sm text-muted">本月花了</p>
            <p className="mt-1 text-2xl font-semibold text-ink">¥{expense.toFixed(2)}</p>
          </div>
          <div>
            <p className="mt-1 block text-sm text-muted">本月进账</p>
            <p className="mt-1 text-2xl font-semibold text-ink">¥{income.toFixed(2)}</p>
          </div>
          <div>
            <p className="mt-1 block text-sm text-muted">结余</p>
            <p className="mt-1 text-2xl font-semibold text-ink">¥{balance.toFixed(2)}</p>
          </div>
        </div>
      )}
    </section>
  );
}
