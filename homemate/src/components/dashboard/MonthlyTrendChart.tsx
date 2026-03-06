"use client";

import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { supabase } from "@/lib/supabase/client";
import { CHART_COLORS } from "@/lib/theme/chartPalette";
import EmptyState from "@/components/EmptyState";

const LEGEND_LABELS: Record<string, string> = {
  expense: "支出",
  income: "收入",
};

export default function MonthlyTrendChart() {
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
  const [data, setData] = useState<Array<{ day: string; expense: number; income: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const start = selectedMonth.startOf("month").format("YYYY-MM-DD");
      const end = selectedMonth.endOf("month").format("YYYY-MM-DD");

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

      const daysInMonth = selectedMonth.daysInMonth();
      const expenseTotals = Array.from({ length: daysInMonth }, () => 0);
      const incomeTotals = Array.from({ length: daysInMonth }, () => 0);

      rows.forEach((row) => {
        const dayIndex = dayjs(row.occurred_at).date() - 1;
        const amount = Number(row.amount_base || 0);
        if (row.type === "expense") {
          expenseTotals[dayIndex] += amount;
        } else {
          incomeTotals[dayIndex] += amount;
        }
      });

      const series = Array.from({ length: daysInMonth }, (_, i) => ({
        day: String(i + 1),
        expense: expenseTotals[i],
        income: incomeTotals[i],
      }));

      setData(series);
      setLoading(false);
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [selectedMonth]);

  const hasData = useMemo(
    () => data.some((item) => item.expense > 0 || item.income > 0),
    [data]
  );

  const legendFormatter = (value: string) => LEGEND_LABELS[value] ?? value;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 text-lg font-semibold text-ink">本月趋势</h3>
        <input
          type="month"
          value={selectedMonth.format("YYYY-MM")}
          onChange={(event) => setSelectedMonth(dayjs(`${event.target.value}-01`))}
          className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary"
        />
      </div>
      {loading ? (
        <p className="text-sm text-muted">加载中…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : !hasData ? (
        <EmptyState title="还没有数据" />
      ) : (
        <div style={{ width: "100%", height: 400 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 24, right: 16, left: 8, bottom: 12 }}>
              <XAxis
                dataKey="day"
                tickMargin={8}
                label={{ value: "日 期", position: "end", dy: 20, style: { fontSize: 14, fontWeight: "bold", fill: CHART_COLORS.axisLabel } }}
              />
              <YAxis
                tickMargin={8}
                label={{ value: "金 额", angle: 0, position: "insideTop", dy: -32, style: { fontSize: 14, fontWeight: "bold", fill: CHART_COLORS.axisLabel } }}
              />
              <Tooltip />
              <Legend
                align="center"
                verticalAlign="top"
                wrapperStyle={{ paddingBottom: 8 }}
                formatter={legendFormatter}
              />
              <Line type="monotone" dataKey="expense" stroke={CHART_COLORS.expense} strokeWidth={2} />
              <Line type="monotone" dataKey="income" stroke={CHART_COLORS.income} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
