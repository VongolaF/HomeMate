"use client";

import StatCards from "./StatCards";
import SavingsGoalsSummaryCard from "./SavingsGoalsSummaryCard";
import MonthlyTrendChart from "./MonthlyTrendChart";
import DashboardCalendar from "./DashboardCalendar";
import PageHeader from "@/components/PageHeader";

export default function Dashboard() {
  return (
    <div className="app-page">
      <PageHeader title="首页" subtitle="家庭财务总览与关键提醒" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-stretch gap-4">
        <StatCards />
        <SavingsGoalsSummaryCard />
      </div>
      <div className="grid gap-4">
        <MonthlyTrendChart />
        <DashboardCalendar />
      </div>
    </div>
  );
}
