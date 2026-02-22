"use client";

import { Alert, Card, DatePicker, Empty, Skeleton } from "antd";
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

type TransactionRow = { amount_base: number | null; category_id: string | null };
type CategoryRow = { id: string; name: string };

function renderCategoryYAxisLabel(props: unknown) {
  const viewBox = (props as { viewBox?: { x?: number; y?: number; height?: number } })?.viewBox;
  if (!viewBox) return "";
  const x = Number(viewBox.x ?? 0);
  const y = Number(viewBox.y ?? 0);
  const height = Number(viewBox.height ?? 0);

  const cx = x + 10;
  const cy = y + height / 2;

  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#000"
      fontSize={14}
      fontWeight={700}
    >
      <tspan x={cx} dy={-8}>
        分
      </tspan>
      <tspan x={cx} dy={16}>
        类
      </tspan>
    </text>
  );
}

export default function MonthlyTopIncomeCategories() {
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

      const [transactionsRes, categoriesRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("amount_base, category_id")
          .eq("type", "income")
          .gte("occurred_at", start)
          .lte("occurred_at", end),
        supabase.from("user_categories").select("id,name").eq("type", "income"),
      ]);

      const rows = transactionsRes.data;
      const fetchError = transactionsRes.error;
      const categoryRows = categoriesRes.data;
      const categoriesError = categoriesRes.error;

      if (!isMounted) return;
      if (fetchError || categoriesError || !rows || !categoryRows) {
        setData([]);
        setError("加载没成功");
        setLoading(false);
        return;
      }

      const categoryMap = new Map(
        (categoryRows as CategoryRow[]).map((category) => [category.id, category.name])
      );

      const map = new Map<string, number>();
      (rows as TransactionRow[]).forEach((row) => {
        const name = row.category_id ? categoryMap.get(row.category_id) ?? "未分类" : "未分类";
        const amount = Number(row.amount_base || 0);
        map.set(name, (map.get(name) || 0) + amount);
      });

      const sorted = Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      setData(sorted);
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
      title="当月收入 Top 分类"
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
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 16, right: 16, left: 32, bottom: 8 }}
            >
              <XAxis
                type="number"
                label={{
                  value: "金 额",
                  position: "end",
                  dy: 15,
                  style: { fontSize: 14, fontWeight: "bold", fill: "#000" },
                }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                label={{ position: "insideLeft", content: renderCategoryYAxisLabel }}
              />
              <Tooltip />
              <Legend align="center" verticalAlign="top" wrapperStyle={{ paddingBottom: 8 }} />
              <Bar dataKey="value" name="收入" fill="#7c9cff" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
