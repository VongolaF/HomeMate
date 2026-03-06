"use client";

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
    <section className="rounded-2xl border-2 border-line bg-panel p-4 shadow-soft">
      <h3 className="mb-3 border-b border-line pb-3 text-base font-semibold text-ink">{title}</h3>
      {goals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-sky-50/60 p-6 text-center text-sm text-muted">
          {emptyText}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </section>
  );
}
