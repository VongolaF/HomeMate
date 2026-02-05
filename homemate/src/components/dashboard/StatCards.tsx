"use client";

import { Card } from "antd";

export default function StatCards() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      <Card title="本月支出">¥0</Card>
      <Card title="本月收入">¥0</Card>
      <Card title="结余">¥0</Card>
      <Card title="目标进度">0%</Card>
    </div>
  );
}
