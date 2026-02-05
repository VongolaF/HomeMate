"use client";

import StatCards from "./StatCards";
import MonthlyTrendChart from "./MonthlyTrendChart";
import CategoryPieChart from "./CategoryPieChart";
import YearlyTrendMini from "./YearlyTrendMini";
import DashboardCalendar from "./DashboardCalendar";

export default function Dashboard() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <StatCards />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <MonthlyTrendChart />
        <CategoryPieChart />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <YearlyTrendMini />
        <DashboardCalendar />
      </div>
    </div>
  );
}
