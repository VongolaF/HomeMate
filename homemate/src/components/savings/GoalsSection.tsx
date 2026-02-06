"use client";

import { Empty, Typography } from "antd";
import GoalCard, { type GoalCardData } from "./GoalCard";

type GoalsSectionProps = {
  title: string;
  goals: GoalCardData[];
  onView: (goal: GoalCardData) => void;
  onEdit: (goal: GoalCardData) => void;
  onDelete: (goal: GoalCardData) => void;
  actionLoading?: boolean;
  emptyText?: string;
};

export default function GoalsSection({
  title,
  goals,
  onView,
  onEdit,
  onDelete,
  actionLoading,
  emptyText = "还没有目标",
}: GoalsSectionProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        {title}
      </Typography.Title>
      {goals.length === 0 ? (
        <Empty description={emptyText} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
