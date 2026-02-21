"use client";

import { Card, Typography } from "antd";

export interface SummaryTotals {
  income: number;
  expense: number;
  net: number;
}

interface TransactionsSummaryProps {
  totals: SummaryTotals;
}

export default function TransactionsSummary({ totals }: TransactionsSummaryProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      <Card>
        <Typography.Text type="secondary">当前筛选收入</Typography.Text>
        <Typography.Title level={3} style={{ margin: "8px 0 0" }}>
          ¥{totals.income.toFixed(2)}
        </Typography.Title>
      </Card>
      <Card>
        <Typography.Text type="secondary">当前筛选支出</Typography.Text>
        <Typography.Title level={3} style={{ margin: "8px 0 0" }}>
          ¥{totals.expense.toFixed(2)}
        </Typography.Title>
      </Card>
      <Card>
        <Typography.Text type="secondary">当前筛选结余</Typography.Text>
        <Typography.Title level={3} style={{ margin: "8px 0 0" }}>
          ¥{totals.net.toFixed(2)}
        </Typography.Title>
      </Card>
    </div>
  );
}
