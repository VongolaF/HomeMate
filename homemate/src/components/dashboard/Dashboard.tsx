"use client";

import StatCards from "./StatCards";
import MonthlyTrendChart from "./MonthlyTrendChart";
import YearlyTrendMini from "./YearlyTrendMini";
import DashboardCalendar from "./DashboardCalendar";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import { Space, Typography } from "antd";

export default function Dashboard() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Space align="center" style={{ justifyContent: "space-between" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          首页
        </Typography.Title>
        {/* <AddTransactionModal buttonText="+ 添加记录" /> */}
      </Space>
      <StatCards />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <MonthlyTrendChart />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        <YearlyTrendMini />
        <div style={{ gridColumn: "1 / -1" }}>
          <DashboardCalendar />
        </div>
      </div>
    </div>
  );
}
