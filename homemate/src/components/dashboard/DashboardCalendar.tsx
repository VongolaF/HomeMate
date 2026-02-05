"use client";

import { Card, Calendar } from "antd";

export default function DashboardCalendar() {
  return (
    <Card title="日历">
      <Calendar fullscreen={false} />
    </Card>
  );
}
