"use client";

import dayjs from "dayjs";

export type GoalCardData = {
  id: string;
  title: string;
  target_amount: number;
  deadline: string | null;
  rule_amount: number | null;
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
  const progressValue = Number(progress.toFixed(0));
  const statusClass =
    status.color === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status.color === "red"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <article className="rounded-2xl border-2 border-line bg-panel p-4 shadow-soft">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-ink">{goal.title}</h4>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}>
            {status.label}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onView(goal)}
          className="text-xs font-semibold text-primary hover:opacity-80"
        >
          看看
        </button>
      </div>

      <div className="space-y-1 text-sm text-muted">
        <p>目标金额：¥{target.toFixed(2)}</p>
        <p>当前金额：¥{current.toFixed(2)}</p>
        <p>截止日期：{goal.deadline ? dayjs(goal.deadline).format("YYYY-MM-DD") : "—"}</p>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>进度</span>
          <span>{progressValue}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-sky-100">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressValue}%` }} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(goal)}
          className="flex-1 rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink"
        >
          改一下
        </button>
        <button
          type="button"
          onClick={() => onDelete(goal)}
          disabled={actionLoading}
          className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-60"
        >
          移除
        </button>
      </div>
    </article>
  );
}
