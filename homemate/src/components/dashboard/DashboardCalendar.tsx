"use client";

import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { CHART_COLORS } from "@/lib/theme/chartPalette";

type EventPriority = "low" | "medium" | "high";

interface CalendarEvent {
  id: string;
  title: string;
  event_date: string;
  priority: EventPriority | null;
}

const WEEK_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

const PRIORITY_DOT: Record<EventPriority, string> = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-emerald-500",
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

  const days = useMemo(() => {
    const startOfMonth = selectedMonth.startOf("month");
    const offset = (startOfMonth.day() + 6) % 7;
    const start = startOfMonth.subtract(offset, "day");
    return Array.from({ length: 42 }, (_, index) => start.add(index, "day"));
  }, [selectedMonth]);

  const selectedKey = selectedDate.format("YYYY-MM-DD");

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 text-lg font-semibold text-ink">日历提醒</h3>
        <div className="text-sm font-medium text-muted">{selectedDate.format("YYYY-MM-DD")}</div>
      </div>

      <div className="mb-3 flex items-center justify-end gap-2">
        <select
          value={selectedMonth.year()}
          onChange={(event) => {
            const next = selectedMonth.year(Number(event.target.value));
            setSelectedMonth(next);
          }}
          className="rounded-lg border border-line bg-white px-2 py-1 text-sm text-ink"
        >
          {Array.from({ length: 11 }, (_, i) => {
            const year = dayjs().year() - 5 + i;
            return (
              <option key={year} value={year}>
                {year}年
              </option>
            );
          })}
        </select>
        <select
          value={selectedMonth.month()}
          onChange={(event) => {
            const next = selectedMonth.month(Number(event.target.value));
            setSelectedMonth(next);
          }}
          className="rounded-lg border border-line bg-white px-2 py-1 text-sm text-ink"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>
              {i + 1}月
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid grid-cols-7 gap-2">
        {WEEK_LABELS.map((label) => (
          <div key={label} className="py-1 text-center text-xs font-semibold text-muted">
            {label}
          </div>
        ))}

        {days.map((current) => {
          const key = current.format("YYYY-MM-DD");
          const dayEvents = eventsByDate.get(key) ?? [];
          const inCurrentMonth = current.isSame(selectedMonth, "month");
          const isSelected = key === selectedKey;
          const isToday = current.isSame(dayjs(), "day");

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(current)}
              className="min-h-[86px] rounded-lg border p-2 text-left transition"
              style={{
                borderColor: CHART_COLORS.calendar.border,
                background: isSelected ? CHART_COLORS.calendar.selectedBg : "#fff",
                boxShadow: isSelected
                  ? `inset 0 0 0 1px ${CHART_COLORS.calendar.selectedRing}`
                  : isToday
                  ? `inset 0 0 0 1px ${CHART_COLORS.calendar.todayRing}`
                  : "none",
                opacity: inCurrentMonth ? 1 : 0.55,
              }}
            >
              <div
                className="mb-1 text-xs font-semibold"
                style={{ color: inCurrentMonth ? CHART_COLORS.calendar.dayCurrent : CHART_COLORS.calendar.dayMuted }}
              >
                {current.date()}
              </div>
              <div className="grid gap-1">
                {dayEvents.slice(0, 2).map((event) => {
                  const priority = event.priority ?? "medium";
                  return (
                    <div key={event.id} className="flex items-center gap-1 text-[11px] text-ink" title={event.title}>
                      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[priority]}`} />
                      <span className="truncate">{event.title}</span>
                    </div>
                  );
                })}
                {dayEvents.length > 2 ? <span className="text-[11px] text-muted">+{dayEvents.length - 2}</span> : null}
              </div>
            </button>
          );
        })}
      </div>

      {loading ? <p className="mt-3 text-sm text-muted">加载中...</p> : null}
    </section>
  );
}
