"use client";

import { Button, Card, Space, Typography } from "antd";

export type WorkoutSlot = "cardio" | "strength" | "notes" | "duration";

export type WorkoutDayPlan = {
  date: string;
  weekdayLabel: string;
  cardio?: string | null;
  strength?: string | null;
  duration_min?: number | null;
  notes?: string | null;
};

type WorkoutWeekTableProps = {
  data: WorkoutDayPlan[];
  onSelect: (selection: { date: string; selectionType: "day" | "slot"; slotType?: WorkoutSlot }) => void;
  selected?: { date: string; selectionType: "day" | "slot"; slotType?: WorkoutSlot } | null;
};

const workoutSlots: Array<{ key: WorkoutSlot; label: string }> = [
  { key: "cardio", label: "有氧" },
  { key: "strength", label: "无氧" },
  { key: "duration", label: "时长" },
  { key: "notes", label: "备注" },
];

const renderValueButton = (
  value: string | number | null | undefined,
  date: string,
  slotType: WorkoutSlot,
  onSelect: WorkoutWeekTableProps["onSelect"],
  selected?: WorkoutWeekTableProps["selected"]
) => {
  const isSelected =
    selected?.date === date && selected?.selectionType === "slot" && selected?.slotType === slotType;
  const display = value === null || value === undefined || value === "" ? "-" : String(value);

  return (
    <Button
      type="link"
      size="small"
      onClick={() => onSelect({ date, selectionType: "slot", slotType })}
      style={{ padding: 0, height: "auto", fontWeight: isSelected ? 600 : 400 }}
      aria-current={isSelected ? "true" : undefined}
    >
      {slotType === "duration" && display !== "-" ? `${display} min` : display}
    </Button>
  );
};

export default function WorkoutWeekTable({ data, onSelect, selected = null }: WorkoutWeekTableProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {data.map((day) => (
        <Card
          key={day.date}
          size="small"
          title={
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelect({ date: day.date, selectionType: "day" })}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect({ date: day.date, selectionType: "day" });
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <Space orientation="vertical" size={0}>
                <Typography.Text strong>
                  {day.weekdayLabel}
                  {selected?.date === day.date && selected?.selectionType === "day" ? "（已选）" : ""}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {day.date}
                </Typography.Text>
              </Space>
            </div>
          }
          style={{ width: "100%" }}
        >
          <Space orientation="vertical" size={10} style={{ width: "100%" }}>
            {workoutSlots.map((slot) => {
              const rawValue: string | number | null | undefined =
                slot.key === "duration"
                  ? day.duration_min
                  : slot.key === "cardio"
                    ? day.cardio
                    : slot.key === "strength"
                      ? day.strength
                      : day.notes;
              return (
                <div
                  key={slot.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "52px 1fr",
                    gap: 8,
                    alignItems: "start",
                  }}
                >
                  <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: "20px" }}>
                    {slot.label}
                  </Typography.Text>
                  <div style={{ lineHeight: "20px" }}>
                    {renderValueButton(rawValue, day.date, slot.key, onSelect, selected)}
                  </div>
                </div>
              );
            })}
          </Space>
        </Card>
      ))}
    </div>
  );
}
