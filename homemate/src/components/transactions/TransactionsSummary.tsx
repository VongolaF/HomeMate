"use client";

import { Card, Empty, Space, Typography } from "antd";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

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

export interface SummaryTrendPoint {
  day: string;
  income: number;
  expense: number;
}

interface TransactionsSummaryProps {
  totals: SummaryTotals;
  categoryBreakdown: SummaryCategoryItem[];
  trendData: SummaryTrendPoint[];
}

export default function TransactionsSummary({
  totals,
  categoryBreakdown,
  trendData,
}: TransactionsSummaryProps) {
  const hasCategoryData = categoryBreakdown.some((item) => item.value > 0);
  const hasTrendData = trendData.some((item) => item.income > 0 || item.expense > 0);

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
      <Card title="本月趋势" style={{ gridColumn: "1 / -1" }}>
        {hasTrendData ? (
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={trendData} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
                <XAxis dataKey="day" tickMargin={8} />
                <YAxis tickMargin={8} />
                <Tooltip />
                <Line type="monotone" dataKey="expense" stroke="#ff6fae" strokeWidth={2} />
                <Line type="monotone" dataKey="income" stroke="#7c9cff" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty description="还没有趋势数据" />
        )}
      </Card>
    </div>
  );
}
