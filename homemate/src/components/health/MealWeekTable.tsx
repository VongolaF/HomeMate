"use client";

import { Button, Card, Space, Typography } from "antd";

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snacks";

export type MealDayPlan = {
  date: string;
  weekdayLabel: string;
  breakfast?: string | null;
  lunch?: string | null;
  dinner?: string | null;
  snacks?: string | null;
};

type MealWeekTableProps = {
  data: MealDayPlan[];
  onSelect: (selection: { date: string; selectionType: "day" | "slot"; slotType?: MealSlot }) => void;
  selected?: { date: string; selectionType: "day" | "slot"; slotType?: MealSlot } | null;
};

const mealSlots: Array<{ key: MealSlot; label: string }> = [
  { key: "breakfast", label: "早餐" },
  { key: "lunch", label: "午餐" },
  { key: "dinner", label: "晚餐" },
  { key: "snacks", label: "加餐" },
];

const renderValueButton = (
  value: string | null | undefined,
  date: string,
  slotType: MealSlot,
  onSelect: MealWeekTableProps["onSelect"],
  selected?: MealWeekTableProps["selected"]
) => {
  const isSelected =
    selected?.date === date && selected?.selectionType === "slot" && selected?.slotType === slotType;
  const display = value?.trim() ? value : "-";

  return (
    <Button
      type="link"
      size="small"
      onClick={() => onSelect({ date, selectionType: "slot", slotType })}
      style={{ padding: 0, height: "auto", fontWeight: isSelected ? 600 : 400 }}
      aria-current={isSelected ? "true" : undefined}
    >
      {display}
    </Button>
  );
};

export default function MealWeekTable({ data, onSelect, selected = null }: MealWeekTableProps) {
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
            {mealSlots.map((slot) => (
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
                  {renderValueButton(
                    day[slot.key],
                    day.date,
                    slot.key,
                    onSelect,
                    selected
                  )}
                </div>
              </div>
            ))}
          </Space>
        </Card>
      ))}
    </div>
  );
}
