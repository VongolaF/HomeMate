"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";
import { groupGoalsByHorizon } from "@/lib/savings/grouping";
import GoalsSection from "@/components/savings/GoalsSection";

type SavingsGoal = {
  id: string;
  title: string;
  target_amount: number;
  deadline: string | null;
  rule_amount: number | null;
  current_amount: number | null;
};

type Contribution = {
  id: string;
  goal_id: string;
  amount: number;
  contributed_at: string;
};

type GoalFormValues = {
  title: string;
  target_amount: number;
  deadline?: string;
  rule_amount?: number;
};

type ContributionFormValues = {
  amount: number;
  contributed_at: string;
};

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [saving, setSaving] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeGoal, setActiveGoal] = useState<SavingsGoal | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contribLoading, setContribLoading] = useState(false);
  const [contribSaving, setContribSaving] = useState(false);
  const { user } = useAuth();

  const [goalForm, setGoalForm] = useState<GoalFormValues>({
    title: "",
    target_amount: 0,
    deadline: undefined,
    rule_amount: undefined,
  });
  const [contributionForm, setContributionForm] = useState<ContributionFormValues>({
    amount: 0,
    contributed_at: dayjs().format("YYYY-MM-DD"),
  });

  const loadGoals = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("savings_goals")
      .select("id,title,target_amount,deadline,rule_amount,current_amount")
      .order("deadline", { ascending: true, nullsFirst: false });

    if (fetchError || !data) {
      setError("加载没成功");
      setLoading(false);
      return;
    }

    setGoals(data as SavingsGoal[]);
    setLoading(false);
  };

  const loadContributions = async (goalId: string) => {
    setContribLoading(true);
    const { data, error: fetchError } = await supabase
      .from("savings_contributions")
      .select("id,goal_id,amount,contributed_at")
      .eq("goal_id", goalId)
      .order("contributed_at", { ascending: false });

    if (fetchError || !data) {
      setContributions([]);
      setContribLoading(false);
      return;
    }

    setContributions(data as Contribution[]);
    setContribLoading(false);
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const openCreate = () => {
    setEditingGoal(null);
    setGoalForm({
      title: "",
      target_amount: 0,
      deadline: undefined,
      rule_amount: undefined,
    });
    setModalOpen(true);
  };

  const openEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      target_amount: goal.target_amount,
      deadline: goal.deadline || undefined,
      rule_amount: goal.rule_amount || undefined,
    });
    setModalOpen(true);
  };

  const openDetail = async (goal: SavingsGoal) => {
    setActiveGoal(goal);
    setDrawerOpen(true);
    setContributionForm({
      amount: 0,
      contributed_at: dayjs().format("YYYY-MM-DD"),
    });
    await loadContributions(goal.id);
  };

  const handleSaveGoal = async () => {
    const values = goalForm;
    if (!values.title.trim()) {
      setError("填一下目标名字");
      return;
    }
    if (!Number.isFinite(values.target_amount) || Number(values.target_amount) <= 0) {
      setError("填一下目标金额");
      return;
    }

    setSaving(true);
    setError(null);

    if (!user) {
      setError("请先登录");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      title: values.title.trim(),
      target_amount: values.target_amount,
      deadline: values.deadline || null,
      rule_amount: values.rule_amount ?? 0,
    };

    if (editingGoal) {
      const { error: updateError } = await supabase
        .from("savings_goals")
        .update({
          title: payload.title,
          target_amount: payload.target_amount,
          deadline: payload.deadline,
          rule_amount: payload.rule_amount,
        })
        .eq("id", editingGoal.id);

      if (updateError) {
        setError("保存没成功");
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("savings_goals").insert(payload);
      if (insertError) {
        setError("保存没成功");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setModalOpen(false);
    await loadGoals();
  };

  const handleDeleteGoal = async (goal: SavingsGoal) => {
    setSaving(true);
    setError(null);
    const { error: deleteError } = await supabase
      .from("savings_goals")
      .delete()
      .eq("id", goal.id);

    if (deleteError) {
      setError("删除没成功");
      setSaving(false);
      return;
    }

    setSaving(false);
    await loadGoals();
  };

  const handleAddContribution = async () => {
    if (!activeGoal) return;
    const values = contributionForm;
    if (!Number.isFinite(values.amount) || Number(values.amount) <= 0) return;
    if (!values.contributed_at) return;

    setContribSaving(true);

    const amount = Number(values.amount || 0);
    const contributed_at = values.contributed_at;

    const { error: insertError } = await supabase.from("savings_contributions").insert({
      goal_id: activeGoal.id,
      amount,
      contributed_at,
      source: "manual",
    });

    if (insertError) {
      setContribSaving(false);
      return;
    }

    const nextCurrent = Number(activeGoal.current_amount || 0) + amount;
    await supabase
      .from("savings_goals")
      .update({ current_amount: nextCurrent })
      .eq("id", activeGoal.id);

    const updatedGoal = { ...activeGoal, current_amount: nextCurrent };
    setActiveGoal(updatedGoal);

    await loadGoals();
    await loadContributions(activeGoal.id);
    setContribSaving(false);
    setContributionForm({ amount: 0, contributed_at: dayjs().format("YYYY-MM-DD") });
  };

  const groupedGoals = useMemo(() => groupGoalsByHorizon(goals), [goals]);

  const confirmDeleteGoal = (goal: SavingsGoal) => {
    const confirmed = window.confirm("确定删除这个目标？");
    if (confirmed) {
      handleDeleteGoal(goal);
    }
  };

  const activeProgress = activeGoal
    ? Number(
        (
          ((Number(activeGoal.current_amount || 0) || 0) / (Number(activeGoal.target_amount || 0) || 1)) *
          100
        ).toFixed(0)
      )
    : 0;

  return (
    <div className="app-page">
      <PageHeader
        title="存钱目标"
        subtitle="按短期与长期目标管理储蓄进度"
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white"
          >
            新建小目标
          </button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-line bg-panel p-4 text-sm text-muted">加载中...</div>
      ) : null}

      <div className="grid gap-4">
        <GoalsSection
          title="短期目标"
          goals={groupedGoals.shortTerm}
          onView={openDetail}
          onEdit={openEdit}
          onDelete={confirmDeleteGoal}
          actionLoading={saving}
          emptyText="还没有短期目标"
        />
        <GoalsSection
          title="长期目标"
          goals={groupedGoals.longTerm}
          onView={openDetail}
          onEdit={openEdit}
          onDelete={confirmDeleteGoal}
          actionLoading={saving}
          emptyText="还没有长期目标"
        />
        <GoalsSection
          title="无截止日期"
          goals={groupedGoals.noDeadline}
          onView={openDetail}
          onEdit={openEdit}
          onDelete={confirmDeleteGoal}
          actionLoading={saving}
          emptyText="还没有无截止日期目标"
        />
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-panel p-5 shadow-soft">
            <h3 className="mb-4 text-lg font-semibold text-ink">{editingGoal ? "修改目标" : "添加目标"}</h3>
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm text-muted">
                目标名字
                <input
                  value={goalForm.title}
                  onChange={(event) => setGoalForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="例如：旅行基金"
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
                />
              </label>
              <label className="grid gap-1 text-sm text-muted">
                想存的金额
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={goalForm.target_amount || 0}
                  onChange={(event) =>
                    setGoalForm((prev) => ({ ...prev, target_amount: Number(event.target.value) }))
                  }
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
                />
              </label>
              <label className="grid gap-1 text-sm text-muted">
                截止日期（可选）
                <input
                  type="date"
                  value={goalForm.deadline || ""}
                  onChange={(event) => setGoalForm((prev) => ({ ...prev, deadline: event.target.value || undefined }))}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
                />
              </label>
              <label className="grid gap-1 text-sm text-muted">
                每月自动存入（可选）
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={goalForm.rule_amount ?? ""}
                  onChange={(event) =>
                    setGoalForm((prev) => ({
                      ...prev,
                      rule_amount: event.target.value ? Number(event.target.value) : undefined,
                    }))
                  }
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={saving}
                className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setDrawerOpen(false)}>
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-line bg-panel p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">{activeGoal?.title}</h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg border border-line px-2 py-1 text-xs text-muted"
              >
                关闭
              </button>
            </div>

        {activeGoal && (
          <div className="space-y-4">
            <p className="text-sm text-muted">目标金额：¥{Number(activeGoal.target_amount || 0).toFixed(2)}</p>
            <p className="text-sm text-muted">当前金额：¥{Number(activeGoal.current_amount || 0).toFixed(2)}</p>

            <div>
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span>进度</span>
                <span>{activeProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-sky-100">
                <div className="h-full rounded-full bg-primary" style={{ width: `${activeProgress}%` }} />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="grid gap-1 text-sm text-muted">
                本次存入金额
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={contributionForm.amount || 0}
                  onChange={(event) =>
                    setContributionForm((prev) => ({ ...prev, amount: Number(event.target.value) }))
                  }
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
                />
              </label>
              <label className="grid gap-1 text-sm text-muted">
                这次存入日期
                <input
                  type="date"
                  value={contributionForm.contributed_at}
                  onChange={(event) =>
                    setContributionForm((prev) => ({ ...prev, contributed_at: event.target.value }))
                  }
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none"
                />
              </label>
              <button
                type="button"
                onClick={handleAddContribution}
                disabled={contribSaving}
                className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {contribSaving ? "保存中..." : "记一笔存入"}
              </button>
            </div>

            <h4 className="pt-2 text-base font-semibold text-ink">存入明细</h4>
            {contribLoading ? <p className="text-sm text-muted">加载中...</p> : null}
            {!contribLoading && contributions.length === 0 ? (
              <p className="text-sm text-muted">暂无明细</p>
            ) : null}
            {!contribLoading && contributions.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-sky-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-muted">存入日期</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted">存入金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contributions.map((item) => (
                      <tr key={item.id} className="border-t border-line bg-white/90">
                        <td className="px-3 py-2 text-ink">{item.contributed_at}</td>
                        <td className="px-3 py-2 text-ink">¥{Number(item.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
