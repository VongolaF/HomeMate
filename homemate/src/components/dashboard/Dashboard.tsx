"use client";

import StatCards from "./StatCards";
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
      <StatCards />
      <div style={{ display: "grid", gap: 16 }}>
        <MonthlyTrendChart />
        <DashboardCalendar />
      </div>
    </div>
  );
}
