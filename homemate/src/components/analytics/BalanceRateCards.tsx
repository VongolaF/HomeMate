"use client";

import { Alert, Card, Skeleton, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

function formatPercent(value: number | null) {
  if (value === null) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function safeRatio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

interface BalanceRateCardsProps {
  selectedYear: Dayjs;
}

export default function BalanceRateCards({ selectedYear }: BalanceRateCardsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [yearIncome, setYearIncome] = useState(0);
  const [yearExpense, setYearExpense] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const monthStart = dayjs().startOf("month").format("YYYY-MM-DD");
      const monthEnd = dayjs().endOf("month").format("YYYY-MM-DD");
      const yearStart = selectedYear.startOf("year").format("YYYY-MM-DD");
      const yearEnd = selectedYear.endOf("year").format("YYYY-MM-DD");

      const [monthRes, yearRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("amount_base,type,occurred_at")
          .gte("occurred_at", monthStart)
          .lte("occurred_at", monthEnd),
        supabase
          .from("transactions")
          .select("amount_base,type,occurred_at")
          .gte("occurred_at", yearStart)
          .lte("occurred_at", yearEnd),
      ]);

      if (!isMounted) return;
      if (monthRes.error || yearRes.error || !monthRes.data || !yearRes.data) {
        setError("加载没成功");
        setLoading(false);
        return;
      }

      let mIncome = 0;
      let mExpense = 0;
      monthRes.data.forEach((row) => {
        const amount = Number(row.amount_base || 0);
        if (row.type === "income") mIncome += amount;
        else mExpense += amount;
      });

      let yIncome = 0;
      let yExpense = 0;
      yearRes.data.forEach((row) => {
        const amount = Number(row.amount_base || 0);
        if (row.type === "income") yIncome += amount;
        else yExpense += amount;
      });

      setMonthIncome(mIncome);
      setMonthExpense(mExpense);
      setYearIncome(yIncome);
      setYearExpense(yExpense);
      setLoading(false);
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  const monthRate = useMemo(
    () => safeRatio(monthIncome - monthExpense, monthIncome),
    [monthExpense, monthIncome]
  );

  const yearRate = useMemo(
    () => safeRatio(yearIncome - yearExpense, yearIncome),
    [yearExpense, yearIncome]
  );

  return (
    <Card title="结余率" style={{ gridColumn: "1 / -1" }}>
      {loading ? (
        <Skeleton active />
      ) : error ? (
        <Alert type="error" title={error} showIcon />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <Typography.Text type="secondary">当月结余率</Typography.Text>
            <Typography.Title level={4} style={{ margin: "4px 0 0" }}>
              {formatPercent(monthRate)}
            </Typography.Title>
            <Typography.Text type="secondary">
              收入 ¥{monthIncome.toFixed(2)} / 支出 ¥{monthExpense.toFixed(2)}
            </Typography.Text>
          </div>
          <div>
            <Typography.Text type="secondary">{selectedYear.year()} 年平均结余率</Typography.Text>
            <Typography.Title level={4} style={{ margin: "4px 0 0" }}>
              {formatPercent(yearRate)}
            </Typography.Title>
            <Typography.Text type="secondary">
              收入 ¥{yearIncome.toFixed(2)} / 支出 ¥{yearExpense.toFixed(2)}
            </Typography.Text>
          </div>
        </div>
      )}
    </Card>
  );
}
