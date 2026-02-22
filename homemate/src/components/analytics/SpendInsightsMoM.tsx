"use client";

import { Alert, Card, DatePicker, Divider, Empty, Skeleton, Space, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type TransactionRow = { amount_base: number | null; occurred_at: string; category_id: string | null };
type CategoryRow = { id: string; name: string };

function monthKey(date: string) {
  return dayjs(date).format("YYYY-MM");
}

interface SpendInsightsMoMProps {
  selectedMonth: Dayjs;
  onSelectedMonthChange: (month: Dayjs) => void;
}

export default function SpendInsightsMoM({
  selectedMonth,
  onSelectedMonthChange,
}: SpendInsightsMoMProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<
    Array<{ name: string; current: number; previous: number; delta: number }>
  >([]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const currentMonth = selectedMonth.startOf("month");
      const prevMonth = currentMonth.subtract(1, "month");

      const start = prevMonth.startOf("month").format("YYYY-MM-DD");
      const end = currentMonth.endOf("month").format("YYYY-MM-DD");

      const [transactionsRes, categoriesRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("amount_base, occurred_at, category_id")
          .eq("type", "expense")
          .gte("occurred_at", start)
          .lte("occurred_at", end),
        supabase.from("user_categories").select("id,name").eq("type", "expense"),
      ]);

      if (!isMounted) return;
      if (transactionsRes.error || categoriesRes.error || !transactionsRes.data || !categoriesRes.data) {
        setError("加载没成功");
        setInsights([]);
        setLoading(false);
        return;
      }

      const categoryMap = new Map(
        (categoriesRes.data as CategoryRow[]).map((category) => [category.id, category.name])
      );

      const currentKey = currentMonth.format("YYYY-MM");
      const prevKey = prevMonth.format("YYYY-MM");

      const currentTotals = new Map<string, number>();
      const prevTotals = new Map<string, number>();

      (transactionsRes.data as TransactionRow[]).forEach((row) => {
        const key = monthKey(row.occurred_at);
        const name = row.category_id ? categoryMap.get(row.category_id) ?? "未分类" : "未分类";
        const amount = Number(row.amount_base || 0);

        if (key === currentKey) {
          currentTotals.set(name, (currentTotals.get(name) ?? 0) + amount);
        } else if (key === prevKey) {
          prevTotals.set(name, (prevTotals.get(name) ?? 0) + amount);
        }
      });

      const allNames = new Set<string>([...currentTotals.keys(), ...prevTotals.keys()]);
      const deltas = Array.from(allNames)
        .map((name) => {
          const current = currentTotals.get(name) ?? 0;
          const previous = prevTotals.get(name) ?? 0;
          return { name, current, previous, delta: current - previous };
        })
        .filter((row) => row.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 5);

      setInsights(deltas);
      setLoading(false);
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [selectedMonth]);

  const hasData = useMemo(() => insights.length > 0, [insights]);

  return (
    <Card
      title="支出优化建议 (环比)"
      extra={
        <DatePicker
          picker="month"
          allowClear={false}
          value={selectedMonth}
          onChange={(value) => value && onSelectedMonthChange(value)}
        />
      }
    >
      {loading ? (
        <Skeleton active />
      ) : error ? (
        <Alert type="error" title={error} showIcon />
      ) : !hasData ? (
        <Empty description="还没有足够数据生成建议" />
      ) : (
        <Space
          orientation="vertical"
          style={{ width: "100%" }}
          separator={<Divider style={{ margin: "8px 0" }} />}
        >
          {insights.map((item) => (
            <div key={item.name} style={{ display: "grid", gap: 2 }}>
              <Typography.Text strong>
                {item.name} 增加 ¥{item.delta.toFixed(2)}
              </Typography.Text>
              <Typography.Text type="secondary">
                上月 ¥{item.previous.toFixed(2)} → 本月 ¥{item.current.toFixed(2)}
              </Typography.Text>
            </div>
          ))}
        </Space>
      )}
    </Card>
  );
}
