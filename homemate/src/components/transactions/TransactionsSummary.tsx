"use client";

import { Card, Empty, Space, Typography } from "antd";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#ff8fb1", "#ffd39f", "#9ad0ff", "#c3f0ca", "#c9b7ff"];

export interface SummaryTotals {
  income: number;
  expense: number;
  net: number;
}

export interface SummaryCategoryItem {
  name: string;
  value: number;
}

interface TransactionsSummaryProps {
  totals: SummaryTotals;
  categoryBreakdown: SummaryCategoryItem[];
}

export default function TransactionsSummary({ totals, categoryBreakdown }: TransactionsSummaryProps) {
  const hasCategoryData = categoryBreakdown.some((item) => item.value > 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      <Card>
        <Typography.Text type="secondary">本月收入</Typography.Text>
        <Typography.Title level={3} style={{ margin: "8px 0 0" }}>
          ¥{totals.income.toFixed(2)}
        </Typography.Title>
      </Card>
      <Card>
        <Typography.Text type="secondary">本月支出</Typography.Text>
        <Typography.Title level={3} style={{ margin: "8px 0 0" }}>
          ¥{totals.expense.toFixed(2)}
        </Typography.Title>
      </Card>
      <Card>
        <Typography.Text type="secondary">本月结余</Typography.Text>
        <Typography.Title level={3} style={{ margin: "8px 0 0" }}>
          ¥{totals.net.toFixed(2)}
        </Typography.Title>
      </Card>
      <Card title="分类占比" style={{ gridColumn: "1 / -1" }}>
        {hasCategoryData ? (
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" outerRadius={90}>
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty description="还没有分类数据" />
        )}
      </Card>
    </div>
  );
}
