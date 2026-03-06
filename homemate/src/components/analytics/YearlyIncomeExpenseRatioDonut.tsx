"use client";

import type { Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/lib/supabase/client";
import { CHART_COLORS } from "@/lib/theme/chartPalette";

interface YearlyIncomeExpenseRatioDonutProps {
  selectedYear: Dayjs;
}

const COLORS = [CHART_COLORS.income, CHART_COLORS.expense];

export default function YearlyIncomeExpenseRatioDonut({
  selectedYear,
}: YearlyIncomeExpenseRatioDonutProps) {
  const [data, setData] = useState<Array<{ name: string; value: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const start = selectedYear.startOf("year").format("YYYY-MM-DD");
      const end = selectedYear.endOf("year").format("YYYY-MM-DD");

      const { data: rows, error: fetchError } = await supabase
        .from("transactions")
        .select("amount_base,type,occurred_at")
        .gte("occurred_at", start)
        .lte("occurred_at", end);

      if (!isMounted) return;
      if (fetchError || !rows) {
        setData([]);
        setError("加载没成功");
        setLoading(false);
        return;
      }

      let income = 0;
      let expense = 0;
      rows.forEach((row) => {
        const amount = Number(row.amount_base || 0);
        if (row.type === "income") income += amount;
        else expense += amount;
      });

      setData([
        { name: "收入", value: income },
        { name: "支出", value: expense },
      ]);
      setLoading(false);
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  const hasData = useMemo(() => data.some((item) => item.value > 0), [data]);

  return (
    <section className="rounded-2xl border-2 border-line bg-panel p-4 shadow-soft">
      <h3 className="mb-3 text-base font-semibold text-ink">年度收支占比</h3>
      {loading ? <p className="text-sm text-muted">加载中...</p> : null}
      {!loading && error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}
      {!loading && !error && !hasData ? (
        <div className="rounded-xl border border-dashed border-line bg-sky-50/60 p-6 text-center text-sm text-muted">还没有数据</div>
      ) : null}
      {!loading && !error && hasData ? (
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
              >
                {data.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend align="center" verticalAlign="top" wrapperStyle={{ paddingBottom: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </section>
  );
}
