"use client";

import { Card, Progress, Typography } from "antd";
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
        <Typography.Text type="secondary" style={{ fontSize: 16 }}>
          {label}
        </Typography.Text>
        <Typography.Text style={{ display: "block", marginTop: 4, fontSize: 15 }}>
          暂无
        </Typography.Text>
      </div>
    );
  }

  const current = Number(goal.current_amount ?? 0);
  const target = Number(goal.target_amount ?? 0);
  const progress = calcProgress(goal);

  return (
    <div>
      <Typography.Text type="secondary" style={{ fontSize: 16 }}>
        {label}
      </Typography.Text>
      <Typography.Text strong style={{ display: "block", marginTop: 4, fontSize: 17 }}>
        {goal.title}
      </Typography.Text>
      <Typography.Text type="secondary" style={{ display: "block", fontSize: 14 }}>
        ¥{current.toFixed(2)} / ¥{target.toFixed(2)}
      </Typography.Text>
      <Progress percent={Number(progress.toFixed(0))} style={{ marginTop: 8 }} />
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
    <Card
      title={
        <Typography.Text strong style={{ fontSize: 18 }}>
          存钱目标
        </Typography.Text>
      }
      loading={loading}
      style={{ height: "100%" }}
    >
      {error ? (
        <Typography.Text type="danger">{error}</Typography.Text>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <GoalBlock label="短期目标" goal={topGoals.shortTerm} />
          <GoalBlock label="长期目标" goal={topGoals.longTerm} />
          <GoalBlock label="无截止日期" goal={topGoals.noDeadline} />
        </div>
      )}
    </Card>
  );
}
