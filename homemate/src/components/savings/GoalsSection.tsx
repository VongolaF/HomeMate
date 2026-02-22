"use client";

import { Card, Empty, Typography } from "antd";
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
    <Card
      title={
        <Typography.Text strong style={{ fontSize: 16 }}>
          {title}
        </Typography.Text>
      }
      style={{ borderRadius: 16, borderWidth: 2 }}
      styles={{
        header: { borderBottomWidth: 2 },
        body: { paddingTop: 12 },
      }}
    >
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
    </Card>
  );
}
