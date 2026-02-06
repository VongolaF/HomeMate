"use client";

import dayjs from "dayjs";
import { Button, Card, Progress, Space, Tag, Typography } from "antd";

export type GoalCardData = {
  id: string;
  title: string;
  target_amount: number;
  deadline: string | null;
  current_amount: number | null;
};

type GoalCardProps = {
  goal: GoalCardData;
  onView: (goal: GoalCardData) => void;
  onEdit: (goal: GoalCardData) => void;
  onDelete: (goal: GoalCardData) => void;
  actionLoading?: boolean;
};

const getStatusTag = (progress: number, deadline: string | null) => {
  if (progress >= 100) {
    return { label: "已完成", color: "green" };
  }

  if (deadline) {
    const deadlineDate = dayjs(deadline).endOf("day");
    if (deadlineDate.isValid() && deadlineDate.isBefore(dayjs())) {
      return { label: "已逾期", color: "red" };
    }
  }

  return { label: "进行中", color: "blue" };
};

export default function GoalCard({ goal, onView, onEdit, onDelete, actionLoading }: GoalCardProps) {
  const current = Number(goal.current_amount || 0);
  const target = Number(goal.target_amount || 0);
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const status = getStatusTag(progress, goal.deadline);

  return (
    <Card
      title={
        <Space size={8} align="center">
          <Typography.Text strong>{goal.title}</Typography.Text>
          <Tag color={status.color}>{status.label}</Tag>
        </Space>
      }
      extra={
        <Button type="link" onClick={() => onView(goal)}>
          查看
        </Button>
      }
      actions={[
        <Button key="edit" type="link" onClick={() => onEdit(goal)}>
          修改
        </Button>,
        <Button key="delete" type="link" danger loading={actionLoading} onClick={() => onDelete(goal)}>
          删除
        </Button>,
      ]}
    >
      <Space orientation="vertical" style={{ width: "100%" }} size={8}>
        <Typography.Text>目标金额：¥{target.toFixed(2)}</Typography.Text>
        <Typography.Text>当前金额：¥{current.toFixed(2)}</Typography.Text>
        <Typography.Text>
          截止日期：{goal.deadline ? dayjs(goal.deadline).format("YYYY-MM-DD") : "—"}
        </Typography.Text>
        <Progress percent={Number(progress.toFixed(0))} />
      </Space>
    </Card>
  );
}
