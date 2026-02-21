"use client";

import { Alert, Badge, Card, Calendar, Select, Space, Typography } from "antd";
import type { BadgeProps, CalendarProps } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type EventPriority = "low" | "medium" | "high";

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  priority: EventPriority | null;
}

const PRIORITY_STATUS: Record<EventPriority, BadgeProps["status"]> = {
  high: "error",
  medium: "warning",
  low: "success",
};

export default function DashboardCalendar() {
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);

      const start = selectedMonth.startOf("month").format("YYYY-MM-DD");
      const end = selectedMonth.endOf("month").format("YYYY-MM-DD");

      const { data, error: fetchError } = await supabase
        .from("events")
        .select("id,title,event_date,priority")
        .gte("event_date", start)
        .lte("event_date", end)
        .order("event_date", { ascending: true });

      if (!isMounted) return;
      if (fetchError || !data) {
        setEvents([]);
        setError("加载没成功");
        setLoading(false);
        return;
      }

      setEvents(data as CalendarEvent[]);
      setLoading(false);
    };

    fetchEvents();
    return () => {
      isMounted = false;
    };
  }, [selectedMonth]);

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

  const dateCellRender = (current: Dayjs) => {
    const dateKey = current.format("YYYY-MM-DD");
    const dayEvents = eventsByDate.get(dateKey) ?? [];

    if (!dayEvents.length) return null;

    return (
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
        {dayEvents.map((event) => {
          const priority = event.priority ?? "medium";
          return (
            <li key={event.id} title={event.title}>
              <Badge status={PRIORITY_STATUS[priority]} text={event.title} />
            </li>
          );
        })}
      </ul>
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
        <Typography.Text
          style={{ fontSize: 12, fontWeight: isSelected ? 600 : 500, color: dayColor }}
        >
          {current.date()}
        </Typography.Text>
        <div style={{ marginTop: 4 }}>{dateCellRender(current)}</div>
      </div>
    );
  };

  return (
    <Card title="日历提醒">
      {error ? <Alert type="error" title={error} showIcon /> : null}
      <Calendar
        fullscreen={false}
        value={selectedMonth}
        onPanelChange={(value) => setSelectedMonth(value)}
        onSelect={(value) => {
          setSelectedDate(value);
          setSelectedMonth(value);
        }}
        headerRender={({ value, onChange }) => {
          const currentYear = value.year();
          const currentMonth = value.month();
          const yearOptions = Array.from({ length: 11 }, (_, index) => {
            const year = currentYear - 5 + index;
            return { label: `${year}年`, value: year };
          });
          const monthOptions = Array.from({ length: 12 }, (_, index) => ({
            label: `${index + 1}月`,
            value: index,
          }));

          return (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Typography.Text strong style={{ fontSize: 18 }}>
                {selectedDate.format("YYYY-MM-DD")}
              </Typography.Text>
              <Space size={8}>
                <Select
                  size="small"
                  value={currentYear}
                  options={yearOptions}
                  onChange={(nextYear) => {
                    const next = value.year(nextYear);
                    onChange(next);
                    setSelectedMonth(next);
                  }}
                />
                <Select
                  size="small"
                  value={currentMonth}
                  options={monthOptions}
                  onChange={(nextMonth) => {
                    const next = value.month(nextMonth);
                    onChange(next);
                    setSelectedMonth(next);
                  }}
                />
              </Space>
            </div>
          );
        }}
        fullCellRender={fullCellRender}
        className="dashboard-calendar"
        style={{ minHeight: 520 }}
      />
      {loading ? (
        <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
          加载中...
        </Typography.Text>
      ) : null}
    </Card>
  );
}
