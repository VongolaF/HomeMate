"use client";

import { Card, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function StatCards() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expense, setExpense] = useState(0);
  const [income, setIncome] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const start = dayjs().startOf("month").format("YYYY-MM-DD");
      const end = dayjs().endOf("month").format("YYYY-MM-DD");

      const { data: rows, error: fetchError } = await supabase
        .from("transactions")
        .select("amount_base,type")
        .gte("occurred_at", start)
        .lte("occurred_at", end);

      if (!isMounted) return;
      if (fetchError || !rows) {
        setError("加载没成功");
        setLoading(false);
        return;
      }

      let expenseTotal = 0;
      let incomeTotal = 0;
      rows.forEach((row) => {
        const amount = Number(row.amount_base || 0);
        if (row.type === "expense") {
          expenseTotal += amount;
        } else {
          incomeTotal += amount;
        }
      });

      setExpense(expenseTotal);
      setIncome(incomeTotal);
      setLoading(false);
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const balance = useMemo(() => income - expense, [income, expense]);

  return (
    <Card title="本月概览" loading={loading} style={{ height: "100%" }}>
      {error ? (
        <Typography.Text type="danger">加载没成功</Typography.Text>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 15 }}>本月花了</Typography.Text>
            <Typography.Title level={4} style={{ margin: "4px 0 0" }}>
              ¥{expense.toFixed(2)}
            </Typography.Title>
          </div>
          <div>
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 15 }}>本月进账</Typography.Text>
            <Typography.Title level={4} style={{ margin: "4px 0 0" }}>
              ¥{income.toFixed(2)}
            </Typography.Title>
          </div>
          <div>
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 15 }}>结余</Typography.Text>
            <Typography.Title level={4} style={{ margin: "4px 0 0" }}>
              ¥{balance.toFixed(2)}
            </Typography.Title>
          </div>
        </div>
      )}
    </Card>
  );
}
