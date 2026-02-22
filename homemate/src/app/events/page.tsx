"use client";

import { useEffect, useMemo, useState } from "react";
import type { BadgeProps, CalendarProps } from "antd";
import {
  Alert,
  Badge,
  Button,
  Calendar,
  Card,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Switch,
  Select,
  Space,
  Typography,
  Tooltip,
  message,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

type EventPriority = "low" | "medium" | "high";

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  description: string | null;
  status: string | null;
  priority: EventPriority | null;
}

const PRIORITY_STATUS: Record<EventPriority, BadgeProps["status"]> = {
  high: "error",
  medium: "warning",
  low: "success",
};

const PRIORITY_COLORS: Record<EventPriority, string> = {
  high: "#ff4d4f",
  medium: "#fa8c16",
  low: "#52c41a",
};

const PRIORITY_RANK: Record<EventPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

interface EventFormValues {
  title: string;
  event_date: Dayjs;
  description?: string;
  priority: EventPriority;
}

export default function EventsPage() {
  const { user, loading } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form] = Form.useForm<EventFormValues>();

  const refreshMonthEvents = async (month: Dayjs) => {
    if (!user) return;

    setFetching(true);
    setError(null);

    const start = month.startOf("month").format("YYYY-MM-DD");
    const end = month.endOf("month").format("YYYY-MM-DD");

    const { data, error: fetchError } = await supabase
      .from("events")
      .select("id,title,event_date,description,status,priority")
      .eq("user_id", user.id)
      .gte("event_date", start)
      .lte("event_date", end)
      .order("event_date", { ascending: true });

    if (fetchError || !data) {
      setEvents([]);
      setError("加载没成功");
      setFetching(false);
      return;
    }

    setEvents(data as CalendarEvent[]);
    setFetching(false);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setEvents([]);
      return;
    }
    refreshMonthEvents(selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id, selectedMonth.year(), selectedMonth.month()]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const key = event.event_date;
      const next = map.get(key) ?? [];
      next.push(event);
      map.set(key, next);
    });
    return map;
  }, [events]);

  const selectedDateKey = selectedDate.format("YYYY-MM-DD");
  const selectedEvents = eventsByDate.get(selectedDateKey) ?? [];

  const pendingMetaByDate = useMemo(() => {
    const map = new Map<string, { count: number; maxPriority: EventPriority }>();
    events.forEach((event) => {
      const key = event.event_date;
      const isDone = (event.status ?? "open") === "done";
      if (isDone) return;

      const priority = (event.priority ?? "medium") as EventPriority;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { count: 1, maxPriority: priority });
        return;
      }

      const nextMax =
        PRIORITY_RANK[priority] > PRIORITY_RANK[existing.maxPriority]
          ? priority
          : existing.maxPriority;

      map.set(key, { count: existing.count + 1, maxPriority: nextMax });
    });
    return map;
  }, [events]);

  const dateCellRender = (current: Dayjs) => {
    const dateKey = current.format("YYYY-MM-DD");
    const meta = pendingMetaByDate.get(dateKey);
    if (!meta) return null;

    const tooltipText =
      meta.maxPriority === "high"
        ? "当天有高优先级的事情需要处理"
        : "当天有提醒事项，请查看";

    return (
      <div style={{ marginTop: 6 }}>
        <Tooltip title={tooltipText}>
          <span
            aria-label={tooltipText}
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: PRIORITY_COLORS[meta.maxPriority],
            }}
          />
        </Tooltip>
      </div>
    );
  };

  const fullCellRender: CalendarProps<Dayjs>["fullCellRender"] = (current, info) => {
    if (info.type !== "date") return info.originNode;

    const isSelected = current.isSame(selectedDate, "day");
    const isToday = current.isSame(dayjs(), "day");
    const isCurrentMonth =
      current.month() === selectedMonth.month() && current.year() === selectedMonth.year();
    const dayColor = isCurrentMonth ? "#262626" : "#bfbfbf";

    return (
      <div
        style={{
          minHeight: 96,
          padding: 6,
          margin: 4,
          borderRadius: 8,
          border: "1px solid #f0f0f0",
          background: isSelected ? "#fff7e6" : "#ffffff",
          boxShadow: isSelected
            ? "0 0 0 1px #ffd591"
            : isToday
            ? "0 0 0 1px #ffe58f"
            : "none",
          boxSizing: "border-box",
          opacity: isCurrentMonth ? 1 : 0.6,
        }}
      >
        <Typography.Text style={{ fontSize: 12, fontWeight: isSelected ? 600 : 500, color: dayColor }}>
          {current.date()}
        </Typography.Text>
        <div style={{ marginTop: 4 }}>{dateCellRender(current)}</div>
      </div>
    );
  };

  const handleOpenCreateModal = () => {
    setEditing(null);
    form.setFieldsValue({
      title: "",
      event_date: selectedDate,
      description: "",
      priority: "medium",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: CalendarEvent) => {
    setEditing(event);
    form.setFieldsValue({
      title: event.title,
      event_date: dayjs(event.event_date),
      description: event.description ?? "",
      priority: (event.priority ?? "medium") as EventPriority,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    const values = await form.validateFields();

    setIsSaving(true);
    try {
      const event_date = values.event_date.format("YYYY-MM-DD");

      if (editing) {
        const { error: updateError } = await supabase
          .from("events")
          .update({
            title: values.title,
            event_date,
            description: values.description ?? null,
            priority: values.priority,
          })
          .eq("id", editing.id)
          .eq("user_id", user.id);
        if (updateError) throw updateError;
        message.success("已更新提醒事项");
      } else {
        const payload = {
          user_id: user.id,
          title: values.title,
          event_date,
          description: values.description ?? null,
          status: "open",
          priority: values.priority,
        };

        const { error: insertError } = await supabase.from("events").insert(payload);
        if (insertError) throw insertError;
        message.success("已添加提醒事项");
      }

      setIsModalOpen(false);
      setEditing(null);

      const nextMonth = values.event_date;
      setSelectedDate(nextMonth);
      setSelectedMonth(nextMonth);
      await refreshMonthEvents(nextMonth);
    } catch {
      message.error(editing ? "更新失败，请稍后再试" : "添加失败，请稍后再试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!user) return;
    try {
      const { error: deleteError } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;
      message.success("已删除");
      await refreshMonthEvents(selectedMonth);
    } catch {
      message.error("删除失败，请稍后再试");
    }
  };

  const handleToggleDone = async (event: CalendarEvent, nextDone: boolean) => {
    if (!user) return;

    const nextStatus = nextDone ? "done" : "open";
    try {
      const { error: updateError } = await supabase
        .from("events")
        .update({ status: nextStatus })
        .eq("id", event.id)
        .eq("user_id", user.id);
      if (updateError) throw updateError;
      await refreshMonthEvents(selectedMonth);
    } catch {
      message.error("更新状态失败，请稍后再试");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
      <Card
        title={
          <Typography.Text strong style={{ fontSize: 20 }}>
            日历
          </Typography.Text>
        }
      >
        {error ? <Alert type="error" title={error} showIcon /> : null}
        <Calendar
          fullscreen={false}
          value={selectedMonth}
          onPanelChange={(value) => setSelectedMonth(value)}
          onSelect={(value) => {
            setSelectedDate(value);
            setSelectedMonth(value);
          }}
          fullCellRender={fullCellRender}
          className="dashboard-calendar"
          style={{ minHeight: 520 }}
        />
        {fetching ? (
          <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
            加载中...
          </Typography.Text>
        ) : null}
      </Card>

      <Card
        title={
          <Space size={12} align="center">
            <Typography.Text strong style={{ fontSize: 20 }}>
              {selectedDate.format("YYYY-MM-DD")}
            </Typography.Text>
            <Typography.Text type="secondary">提醒事项</Typography.Text>
          </Space>
        }
        extra={
          <Button type="primary" onClick={handleOpenCreateModal} disabled={!user || loading}>
            + 添加提醒事项
          </Button>
        }
      >
        {selectedEvents.length ? (
          <Space
            orientation="vertical"
            style={{ width: "100%" }}
            separator={<Divider style={{ margin: "12px 0" }} />}
          >
            {selectedEvents.map((item) => {
              const priority = item.priority ?? "medium";
              const isDone = (item.status ?? "open") === "done";
              return (
                <div key={item.id} style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <Space size={8}>
                      <Badge status={PRIORITY_STATUS[priority]} />
                      <Typography.Text strong delete={isDone}>
                        {item.title}
                      </Typography.Text>
                    </Space>
                    <Space size={8}>
                      <Space size={6}>
                        <Typography.Text type="secondary">完成</Typography.Text>
                        <Switch
                          checked={isDone}
                          onChange={(checked) => handleToggleDone(item, checked)}
                        />
                      </Space>
                      <Button size="small" onClick={() => handleOpenEditModal(item)}>
                        编辑
                      </Button>
                      <Popconfirm
                        title="确认删除该提醒事项吗？"
                        okText="删除"
                        cancelText="取消"
                        onConfirm={() => handleDelete(item)}
                      >
                        <Button size="small" danger>
                          删除
                        </Button>
                      </Popconfirm>
                    </Space>
                  </div>
                  {item.description ? (
                    <Typography.Text type="secondary">{item.description}</Typography.Text>
                  ) : null}
                </div>
              );
            })}
          </Space>
        ) : (
          <Empty description="当天暂无提醒事项" />
        )}
      </Card>

      <Modal
        title={editing ? "编辑提醒事项" : "添加提醒事项"}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditing(null);
        }}
        onOk={handleSave}
        okText={editing ? "保存" : "添加"}
        cancelText="取消"
        confirmLoading={isSaving}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
            <Input placeholder="例如：缴房租" />
          </Form.Item>
          <Form.Item name="event_date" label="日期" rules={[{ required: true }]}> 
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="priority" label="优先级" rules={[{ required: true }]}> 
            <Select
              options={[
                { value: "high", label: "高 (红 )" },
                { value: "medium", label: "中 (橙 )" },
                { value: "low", label: "低 (绿 )" },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
