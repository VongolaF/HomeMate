"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { groupGoalsByHorizon } from "@/lib/savings/grouping";

type SavingsGoalRow = {
  id: string;
  title: string;
  target_amount: number;
  deadline: string | null;
  current_amount: number | null;
};

function calcProgress(goal: SavingsGoalRow) {
  const current = Number(goal.current_amount ?? 0);
  const target = Number(goal.target_amount ?? 0);
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, Math.min((current / target) * 100, 100));
}

function pickTopGoal(goals: SavingsGoalRow[]) {
  if (!goals.length) return null;
  return goals
    .slice()
    .sort((a, b) => calcProgress(b) - calcProgress(a))[0];
}

function GoalBlock({ label, goal }: { label: string; goal: SavingsGoalRow | null }) {
  if (!goal) {
    return (
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 text-sm text-ink">暂无</p>
      </div>
    );
  }

  const current = Number(goal.current_amount ?? 0);
  const target = Number(goal.target_amount ?? 0);
  const progress = calcProgress(goal);

  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink">{goal.title}</p>
      <p className="text-sm text-muted">¥{current.toFixed(2)} / ¥{target.toFixed(2)}</p>
      <div className="mt-2 h-2 rounded-full bg-primarySoft">
        <div
          className="h-2 rounded-full bg-primary"
          style={{ width: `${Number(progress.toFixed(0))}%` }}
        />
      </div>
    </div>
  );
}

export default function SavingsGoalsSummaryCard() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<SavingsGoalRow[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchGoals = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("savings_goals")
        .select("id,title,target_amount,deadline,current_amount")
        .eq("user_id", user.id);

      if (!isMounted) return;
      if (fetchError || !data) {
        setGoals([]);
        setError("加载没成功");
        setLoading(false);
        return;
      }

      setGoals(data as SavingsGoalRow[]);
      setLoading(false);
    };

    if (!authLoading && user) {
      fetchGoals();
    }

    return () => {
      isMounted = false;
    };
  }, [authLoading, user]);

  const topGoals = useMemo(() => {
    const grouped = groupGoalsByHorizon(goals);
    return {
      shortTerm: pickTopGoal(grouped.shortTerm),
      longTerm: pickTopGoal(grouped.longTerm),
      noDeadline: pickTopGoal(grouped.noDeadline),
    };
  }, [goals]);

  return (
    <section className="h-full rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <h3 className="mb-3 text-lg font-semibold text-ink">存钱目标</h3>
      {loading ? (
        <p className="text-sm text-muted">加载中…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="grid gap-3">
          <GoalBlock label="短期目标" goal={topGoals.shortTerm} />
          <GoalBlock label="长期目标" goal={topGoals.longTerm} />
          <GoalBlock label="无截止日期" goal={topGoals.noDeadline} />
        </div>
      )}
    </section>
  );
}
