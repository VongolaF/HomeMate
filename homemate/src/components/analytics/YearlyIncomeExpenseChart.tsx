"use client";

import { Alert, Card, Empty, Skeleton } from "antd";
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
    <Card title="每月收支分布">
      {loading ? (
        <Skeleton active />
      ) : error ? (
        <Alert type="error" title={error} showIcon />
      ) : !hasData ? (
        <Empty description="还没有数据" />
      ) : (
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}>
              <XAxis dataKey="month" tickMargin={8} />
              <YAxis tickMargin={8} />
              <Tooltip />
              <Legend align="center" verticalAlign="top" wrapperStyle={{ paddingBottom: 8 }} />
              <Bar dataKey="expense" name="支出" fill="#ff6fae" radius={[6, 6, 0, 0]} />
              <Bar dataKey="income" name="收入" fill="#7c9cff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
