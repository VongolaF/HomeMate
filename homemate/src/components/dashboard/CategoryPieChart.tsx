"use client";

import { Alert, Card, DatePicker, Empty, Skeleton } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/lib/supabase/client";

const COLORS = ["#ff8fb1", "#ffd39f", "#9ad0ff", "#c3f0ca", "#c9b7ff"];

export default function CategoryPieChart() {
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
  const [data, setData] = useState<Array<{ name: string; value: number }>>([]);
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
        .select("amount_base, category:categories(name)")
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

      const map = new Map<string, number>();
      rows.forEach((row) => {
        const name = row.category?.name || "未分类";
        const amount = Number(row.amount_base || 0);
        map.set(name, (map.get(name) || 0) + amount);
      });

      setData(Array.from(map.entries()).map(([name, value]) => ({ name, value })));
      setLoading(false);
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [selectedMonth]);

  const hasData = useMemo(() => data.some((item) => item.value > 0), [data]);

  return (
    <Card
      title="分类占比"
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
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={80}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
