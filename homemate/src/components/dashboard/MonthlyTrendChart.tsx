"use client";

import { Alert, Card, DatePicker, Empty, Skeleton } from "antd";
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
    <Card
      title="本月趋势"
      extra={
        <DatePicker
          picker="month"
          allowClear={false}
          value={selectedMonth}
          onChange={(value) => value && setSelectedMonth(value)}
        />
      }
    >
      {loading ? (
        <Skeleton active />
      ) : error ? (
        <Alert type="error" title={error} showIcon />
      ) : !hasData ? (
        <Empty description="还没有数据" />
      ) : (
        <div style={{ width: "100%", height: 400 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 24, right: 16, left: 8, bottom: 12 }}>
              <XAxis
                dataKey="day"
                tickMargin={8}
                label={{ value: "日 期", position: "end", dy: 20, style: { fontSize: 14, fontWeight: "bold", fill: "#000" } }}
              />
              <YAxis
                tickMargin={8}
                label={{ value: "金 额", angle: 0, position: "insideTop", dy: -32, style: { fontSize: 14, fontWeight: "bold", fill: "#000" } }}
              />
              <Tooltip />
              <Legend
                align="center"
                verticalAlign="top"
                wrapperStyle={{ paddingBottom: 8 }}
                formatter={legendFormatter}
              />
              <Line type="monotone" dataKey="expense" stroke="#ff6fae" strokeWidth={2} />
              <Line type="monotone" dataKey="income" stroke="#7c9cff" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
