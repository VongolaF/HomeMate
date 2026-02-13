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

export default function YearlyTrendMini() {
  const [selectedYear, setSelectedYear] = useState<Dayjs>(dayjs());
  const [data, setData] = useState<Array<{ month: number; total: number }>>([]);
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
        .select("amount_base, occurred_at")
        .eq("type", "expense")
        .gte("occurred_at", start)
        .lte("occurred_at", end);

      if (!isMounted) return;
      if (fetchError || !rows) {
        setData([]);
        setError("加载没成功");
        setLoading(false);
        return;
      }

      const map = new Map<number, number>();
      rows.forEach((row) => {
        const month = dayjs(row.occurred_at).month() + 1;
        const amount = Number(row.amount_base || 0);
        map.set(month, (map.get(month) || 0) + amount);
      });

      const series = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        total: map.get(i + 1) ?? 0,
      }));

      setData(series);
      setLoading(false);
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  const hasData = useMemo(() => data.some((item) => item.total > 0), [data]);

  return (
    <Card
      title="今年趋势"
      extra={
        <DatePicker
          picker="year"
          allowClear={false}
          value={selectedYear}
          onChange={(value) => value && setSelectedYear(value)}
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
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}>
              <XAxis
                dataKey="month"
                tickMargin={8}
                label={{ value: "月份", position: "insideBottomRight", dy: 14 }}
              />
              <YAxis
                tickMargin={8}
                label={{ value: "金额（CNY）", angle: 0, position: "insideTop", dy: -12 }}
              />
              <Tooltip />
              <Legend align="center" verticalAlign="top" wrapperStyle={{ paddingBottom: 8 }} />
              <Line type="monotone" dataKey="total" stroke="#8cd4ff" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
