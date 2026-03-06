"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import PageHeader from "@/components/PageHeader";

type EventPriority = "low" | "medium" | "high";

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  description: string | null;
  status: string | null;
  priority: EventPriority | null;
}

type EventFormValues = {
  title: string;
  event_date: string;
  description: string;
  priority: EventPriority;
};

const PRIORITY_COLORS: Record<EventPriority, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

const PRIORITY_RANK: Record<EventPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];

export default function EventsPage() {
  const { user, loading } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventFormValues>({
    title: "",
    event_date: dayjs().format("YYYY-MM-DD"),
    description: "",
    priority: "medium",
  });

  const refreshMonthEvents = async (month: dayjs.Dayjs) => {
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
        PRIORITY_RANK[priority] > PRIORITY_RANK[existing.maxPriority] ? priority : existing.maxPriority;

      map.set(key, { count: existing.count + 1, maxPriority: nextMax });
    });
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const start = selectedMonth.startOf("month");
    const offset = (start.day() + 6) % 7;
    const firstCell = start.subtract(offset, "day");
    return Array.from({ length: 42 }, (_, index) => firstCell.add(index, "day"));
  }, [selectedMonth]);

  const handleOpenCreateModal = () => {
    setEditing(null);
    setForm({
      title: "",
      event_date: selectedDate.format("YYYY-MM-DD"),
      description: "",
      priority: "medium",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: CalendarEvent) => {
    setEditing(event);
    setForm({
      title: event.title,
      event_date: event.event_date,
      description: event.description ?? "",
      priority: (event.priority ?? "medium") as EventPriority,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.title.trim()) return;

    setIsSaving(true);
    setNotice(null);
    try {
      if (editing) {
        const { error: updateError } = await supabase
          .from("events")
          .update({
            title: form.title.trim(),
            event_date: form.event_date,
            description: form.description.trim() || null,
            priority: form.priority,
          })
          .eq("id", editing.id)
          .eq("user_id", user.id);
        if (updateError) throw updateError;
        setNotice("已更新提醒事项");
      } else {
        const payload = {
          user_id: user.id,
          title: form.title.trim(),
          event_date: form.event_date,
          description: form.description.trim() || null,
          status: "open",
          priority: form.priority,
        };

        const { error: insertError } = await supabase.from("events").insert(payload);
        if (insertError) throw insertError;
        setNotice("已添加提醒事项");
      }

      setIsModalOpen(false);
      setEditing(null);

      const nextMonth = dayjs(form.event_date);
      setSelectedDate(nextMonth);
      setSelectedMonth(nextMonth);
      await refreshMonthEvents(nextMonth);
    } catch {
      setNotice(editing ? "更新失败，请稍后再试" : "添加失败，请稍后再试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!user) return;
    const confirmed = window.confirm("确认删除该提醒事项吗？");
    if (!confirmed) return;

    try {
      const { error: deleteError } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;
      setNotice("已删除");
      await refreshMonthEvents(selectedMonth);
    } catch {
      setNotice("删除失败，请稍后再试");
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
      setNotice("更新状态失败，请稍后再试");
    }
  };

  return (
    <div className="app-page">
      <PageHeader title="日历提醒" subtitle="集中管理每月待办与提醒事项" />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">{notice}</div>
      ) : null}

      <div className="app-grid-main-side app-grid-stretch">
        <section className="rounded-2xl border-2 border-line bg-panel p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-ink">日历</h3>
            <input
              type="month"
              value={selectedMonth.format("YYYY-MM")}
              onChange={(event) => {
                const month = dayjs(`${event.target.value}-01`);
                setSelectedMonth(month);
                setSelectedDate(month.startOf("month"));
              }}
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
            />
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
            {weekdayLabels.map((label) => (
              <div key={label} className="py-1 font-medium">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const dateKey = date.format("YYYY-MM-DD");
              const isCurrentMonth = date.month() === selectedMonth.month();
              const isSelected = date.isSame(selectedDate, "day");
              const isToday = date.isSame(dayjs(), "day");
              const meta = pendingMetaByDate.get(dateKey);
              const dotColor = meta ? PRIORITY_COLORS[meta.maxPriority] : "transparent";

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={`min-h-20 rounded-xl border p-2 text-left transition ${
                    isSelected
                      ? "border-sky-300 bg-sky-50"
                      : isToday
                      ? "border-blue-200 bg-blue-50/50"
                      : "border-line bg-white"
                  } ${isCurrentMonth ? "opacity-100" : "opacity-50"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ink">{date.date()}</span>
                    {meta ? (
                      <span
                        aria-label="当天有提醒"
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: dotColor }}
                      />
                    ) : null}
                  </div>
                  {meta ? <p className="mt-1 text-[11px] text-muted">{meta.count} 条待办</p> : null}
                </button>
              );
            })}
          </div>

          {fetching ? <p className="mt-2 text-sm text-muted">加载中...</p> : null}
        </section>

        <section className="rounded-2xl border-2 border-line bg-panel p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-ink">{selectedDate.format("YYYY-MM-DD")}</h3>
              <span className="text-sm text-muted">提醒事项</span>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              disabled={!user || loading}
              className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              + 新建提醒
            </button>
          </div>

          {selectedEvents.length ? (
            <div className="grid gap-3">
              {selectedEvents.map((item) => {
                const priority = item.priority ?? "medium";
                const isDone = (item.status ?? "open") === "done";
                return (
                  <article key={item.id} className="rounded-xl border border-line bg-white/90 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: PRIORITY_COLORS[priority] }}
                        />
                        <p className={`text-sm font-semibold ${isDone ? "text-muted line-through" : "text-ink"}`}>
                          {item.title}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1 text-xs text-muted">
                          完成
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={(event) => handleToggleDone(item, event.target.checked)}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="rounded-lg border border-line px-2 py-1 text-xs font-medium text-ink"
                        >
                          改一下
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700"
                        >
                          移除
                        </button>
                      </div>
                    </div>

                    {item.description ? <p className="mt-2 text-sm text-muted">{item.description}</p> : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-sky-50/60 p-6 text-center text-sm text-muted">
              当天暂无提醒事项
            </div>
          )}
        </section>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-panel p-5 shadow-soft">
            <h3 className="mb-4 text-lg font-semibold text-ink">{editing ? "编辑提醒事项" : "添加提醒事项"}</h3>

            <div className="grid gap-3">
              <label className="grid gap-1 text-sm text-muted">
                标题
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="例如：缴房租"
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                />
              </label>

              <label className="grid gap-1 text-sm text-muted">
                日期
                <input
                  type="date"
                  value={form.event_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, event_date: event.target.value }))}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                />
              </label>

              <label className="grid gap-1 text-sm text-muted">
                优先级
                <select
                  value={form.priority}
                  onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as EventPriority }))}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                >
                  <option value="high">高 (红)</option>
                  <option value="medium">中 (橙)</option>
                  <option value="low">低 (绿)</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm text-muted">
                说明
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="可选"
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditing(null);
                }}
                className="rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSaving ? "保存中..." : editing ? "保存一下" : "添加一下"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
