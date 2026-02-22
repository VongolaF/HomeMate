"use client";

import StatCards from "./StatCards";
import SavingsGoalsSummaryCard from "./SavingsGoalsSummaryCard";
import MonthlyTrendChart from "./MonthlyTrendChart";
import DashboardCalendar from "./DashboardCalendar";
import { Space, Typography } from "antd";

export default function Dashboard() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Space align="center" style={{ justifyContent: "space-between" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          首页
        </Typography.Title>
      </Space>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <StatCards />
        <SavingsGoalsSummaryCard />
      </div>
      <div style={{ display: "grid", gap: 16 }}>
        <MonthlyTrendChart />
        <DashboardCalendar />
      </div>
    </div>
  );
}
