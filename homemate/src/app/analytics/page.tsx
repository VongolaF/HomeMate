"use client";

import { useState } from "react";
import { DatePicker, Space, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import YearlyIncomeExpenseChart from "@/components/analytics/YearlyIncomeExpenseChart";
import YearlyNetTrendChart from "@/components/analytics/YearlyNetTrendChart";
import MonthlyTopExpenseCategories from "@/components/analytics/MonthlyTopExpenseCategories";
import MonthlyTopIncomeCategories from "@/components/analytics/MonthlyTopIncomeCategories";
import YearlyIncomeExpenseRatioDonut from "@/components/analytics/YearlyIncomeExpenseRatioDonut";
import BalanceRateCards from "@/components/analytics/BalanceRateCards";
import SpendInsightsMoM from "@/components/analytics/SpendInsightsMoM";
import MonthlyTrendChart from "@/components/dashboard/MonthlyTrendChart";

export default function AnalyticsPage() {
  const [selectedYear, setSelectedYear] = useState<Dayjs>(dayjs());
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Space align="center" style={{ justifyContent: "space-between" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          统计报表
        </Typography.Title>
        <Space size={8}>
          <Typography.Text type="secondary">年份</Typography.Text>
          <DatePicker
            picker="year"
            allowClear={false}
            value={selectedYear}
            onChange={(value) => value && setSelectedYear(value)}
          />
        </Space>
      </Space>

      <BalanceRateCards selectedYear={selectedYear} />

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <YearlyIncomeExpenseChart selectedYear={selectedYear} />
        <YearlyIncomeExpenseRatioDonut selectedYear={selectedYear} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <YearlyNetTrendChart selectedYear={selectedYear} />
        <SpendInsightsMoM
          selectedMonth={selectedMonth}
          onSelectedMonthChange={setSelectedMonth}
        />
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <MonthlyTrendChart />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <MonthlyTopExpenseCategories />
          <MonthlyTopIncomeCategories />
        </div>
      </div>
    </div>
  );
}
