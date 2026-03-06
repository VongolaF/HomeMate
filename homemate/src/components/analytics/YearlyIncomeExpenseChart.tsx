"use client";

import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase/client";
import { CHART_COLORS } from "@/lib/theme/chartPalette";

interface YearlyIncomeExpenseChartProps {
  selectedYear: Dayjs;
}

export default function YearlyIncomeExpenseChart({
  selectedYear,
}: YearlyIncomeExpenseChartProps) {
  const [data, setData] = useState<Array<{ month: string; expense: number; income: number }>>([]);
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

      const expenseTotals = Array.from({ length: 12 }, () => 0);
      const incomeTotals = Array.from({ length: 12 }, () => 0);

      rows.forEach((row) => {
        const monthIndex = dayjs(row.occurred_at).month();
        const amount = Number(row.amount_base || 0);
        if (row.type === "expense") expenseTotals[monthIndex] += amount;
        else incomeTotals[monthIndex] += amount;
      });

      const series = Array.from({ length: 12 }, (_, index) => ({
        month: `${index + 1}月`,
        expense: expenseTotals[index],
        income: incomeTotals[index],
      }));

      setData(series);
      setLoading(false);
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  const hasData = useMemo(
    () => data.some((item) => item.expense > 0 || item.income > 0),
    [data]
  );

  return (
    <section className="rounded-2xl border-2 border-line bg-panel p-4 shadow-soft">
      <h3 className="mb-3 text-base font-semibold text-ink">每月收支分布</h3>
      {loading ? <p className="text-sm text-muted">加载中...</p> : null}
      {!loading && error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}
      {!loading && !error && !hasData ? (
        <div className="rounded-xl border border-dashed border-line bg-sky-50/60 p-6 text-center text-sm text-muted">还没有数据</div>
      ) : null}
      {!loading && !error && hasData ? (
        <div style={{ width: "100%", height: 350 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 24, right: 16, left: 8, bottom: 12 }}>
              <XAxis
                dataKey="month"
                tickMargin={8}
                label={{
                  value: "月 份",
                  position: "end",
                  dy: 20,
                  style: { fontSize: 14, fontWeight: "bold", fill: CHART_COLORS.axisLabel },
                }}
              />
              <YAxis
                tickMargin={8}
                label={{
                  value: "金 额",
                  angle: 0,
                  position: "insideTop",
                  dy: -32,
                  style: { fontSize: 14, fontWeight: "bold", fill: CHART_COLORS.axisLabel },
                }}
              />
              <Tooltip />
              <Legend align="center" verticalAlign="top" wrapperStyle={{ paddingBottom: 8 }} />
              <Bar dataKey="expense" name="支出" fill={CHART_COLORS.expense} radius={[6, 6, 0, 0]} />
              <Bar dataKey="income" name="收入" fill={CHART_COLORS.income} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </section>
  );
}
