"use client";

import { useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import PageHeader from "@/components/PageHeader";
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

  const yearValue = selectedYear.format("YYYY");

  return (
    <div className="app-page">
      <PageHeader
        title="统计报表"
        subtitle="按年追踪收支结构与趋势变化"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">年份</span>
            <input
              type="number"
              min={2000}
              max={2100}
              value={yearValue}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isNaN(value) && value >= 2000 && value <= 2100) {
                  setSelectedYear(dayjs().year(value));
                }
              }}
              className="w-24 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
            />
          </div>
        }
      />

      <BalanceRateCards selectedYear={selectedYear} />

      <div className="app-grid-main-side app-grid-stretch">
        <YearlyIncomeExpenseChart selectedYear={selectedYear} />
        <YearlyIncomeExpenseRatioDonut selectedYear={selectedYear} />
      </div>

      <div className="app-grid-main-side app-grid-stretch">
        <YearlyNetTrendChart selectedYear={selectedYear} />
        <SpendInsightsMoM
          selectedMonth={selectedMonth}
          onSelectedMonthChange={setSelectedMonth}
        />
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <MonthlyTrendChart />
        <div className="app-grid-two-col app-grid-stretch">
          <MonthlyTopExpenseCategories />
          <MonthlyTopIncomeCategories />
        </div>
      </div>
    </div>
  );
}
