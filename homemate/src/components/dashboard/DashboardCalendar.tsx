"use client";

import { Card, Calendar } from "antd";

export default function DashboardCalendar() {
  return (
    <Card title="日历提醒" style={{ minHeight: 440 }}>
      <Calendar fullscreen={false} style={{ height: 360 }} />
    </Card>
  );
}
