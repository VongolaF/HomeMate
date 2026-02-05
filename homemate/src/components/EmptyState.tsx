"use client";

import { Empty } from "antd";

export default function EmptyState({ title }: { title: string }) {
  return <Empty description={title} />;
}
