"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Space,
  Table,
  Typography,
} from "antd";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
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
  deadline?: Dayjs;
  rule_amount?: number;
};

type ContributionFormValues = {
  amount: number;
  contributed_at: Dayjs;
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

  const [form] = Form.useForm<GoalFormValues>();
  const [contributionForm] = Form.useForm<ContributionFormValues>();

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
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    form.setFieldsValue({
      title: goal.title,
      target_amount: goal.target_amount,
      deadline: goal.deadline ? dayjs(goal.deadline) : undefined,
      rule_amount: goal.rule_amount || undefined,
    });
    setModalOpen(true);
  };

  const openDetail = async (goal: SavingsGoal) => {
    setActiveGoal(goal);
    setDrawerOpen(true);
    contributionForm.setFieldsValue({
      amount: undefined as unknown as number,
      contributed_at: dayjs(),
    });
    await loadContributions(goal.id);
  };

  const handleSaveGoal = async () => {
    const values = await form.validateFields();
    setSaving(true);

    if (!user) {
      setError("请先登录");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      title: values.title,
      target_amount: values.target_amount,
      deadline: values.deadline ? values.deadline.format("YYYY-MM-DD") : null,
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
    const values = await contributionForm.validateFields();
    setContribSaving(true);

    const amount = Number(values.amount || 0);
    const contributed_at = values.contributed_at.format("YYYY-MM-DD");

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
    contributionForm.resetFields();
    contributionForm.setFieldsValue({ contributed_at: dayjs() });
  };

  const columns = useMemo(
    () => [
      { title: "存入日期", dataIndex: "contributed_at", key: "date" },
      { title: "存入金额", dataIndex: "amount", key: "amount" },
    ],
    []
  );

  const groupedGoals = useMemo(() => groupGoalsByHorizon(goals), [goals]);

  const confirmDeleteGoal = (goal: SavingsGoal) => {
    Modal.confirm({
      title: "确定删除这个目标？",
      onOk: () => handleDeleteGoal(goal),
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Space align="center" style={{ justifyContent: "space-between" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          存钱目标
        </Typography.Title>
        <Button type="primary" onClick={openCreate}>
          添加目标
        </Button>
      </Space>

      {error && <Alert type="error" title={error} showIcon />}

      {loading && <Card loading />}

      <div style={{ display: "grid", gap: 16 }}>
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

      <Modal
        title={editingGoal ? "修改目标" : "添加目标"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSaveGoal}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="目标名字" rules={[{ required: true, message: "填一下目标名字" }]}>
            <Input placeholder="例如：旅行基金" />
          </Form.Item>
          <Form.Item
            name="target_amount"
            label="想存的金额"
            rules={[{ required: true, message: "填一下目标金额" }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} precision={2} />
          </Form.Item>
          <Form.Item name="deadline" label="截止日期 (可选 )">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="rule_amount" label="每月自动存入 (可选 )">
            <InputNumber style={{ width: "100%" }} min={0} precision={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={activeGoal?.title}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size="default"
      >
        {activeGoal && (
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Typography.Text>
              目标金额：¥{Number(activeGoal.target_amount || 0).toFixed(2)}
            </Typography.Text>
            <Typography.Text>
              当前金额：¥{Number(activeGoal.current_amount || 0).toFixed(2)}
            </Typography.Text>
            <Progress
              percent={
                Number(
                  (
                    ((Number(activeGoal.current_amount || 0) || 0) /
                      (Number(activeGoal.target_amount || 0) || 1)) *
                    100
                  ).toFixed(0)
                )
              }
            />

            <Form form={contributionForm} layout="vertical">
              <Form.Item
                name="amount"
                label="本次存入金额"
                rules={[{ required: true, message: "填一下金额" }]}
              >
                <InputNumber style={{ width: "100%" }} min={0} precision={2} />
              </Form.Item>
              <Form.Item
                name="contributed_at"
                label="这次存入日期"
                rules={[{ required: true, message: "选一下日期" }]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
              <Button type="primary" block loading={contribSaving} onClick={handleAddContribution}>
                保存存入
              </Button>
            </Form>

            <Typography.Title level={5} style={{ marginTop: 16 }}>
              存入明细
            </Typography.Title>
            <Table
              size="small"
              loading={contribLoading}
              columns={columns}
              dataSource={contributions}
              rowKey="id"
              pagination={false}
            />
          </Space>
        )}
      </Drawer>
    </div>
  );
}
