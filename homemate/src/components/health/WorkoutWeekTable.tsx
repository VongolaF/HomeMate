"use client";

import { Button, Card, Space, Typography, theme } from "antd";

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
  highlightDate?: string;
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
  selected: WorkoutWeekTableProps["selected"] | undefined,
  token: ReturnType<typeof theme.useToken>["token"]
) => {
  const isSelected =
    selected?.date === date && selected?.selectionType === "slot" && selected?.slotType === slotType;
  const display = value === null || value === undefined || value === "" ? "-" : String(value);

  return (
    <Button
      type="link"
      size="small"
      block
      onClick={() => onSelect({ date, selectionType: "slot", slotType })}
      style={{
        padding: 0,
        height: "auto",
        fontWeight: isSelected ? 600 : 400,
        textAlign: "left",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        lineHeight: 1.35,
        color: isSelected ? token.colorPrimaryText : undefined,
        background: isSelected ? token.colorPrimaryBgHover : undefined,
        border: isSelected ? `1px solid ${token.colorPrimaryBorder}` : undefined,
        borderRadius: isSelected ? 8 : undefined,
        paddingInline: isSelected ? 6 : undefined,
        paddingBlock: isSelected ? 4 : undefined,
      }}
      aria-current={isSelected ? "true" : undefined}
    >
      {slotType === "duration" && display !== "-" ? `${display} 分钟` : display}
    </Button>
  );
};

export default function WorkoutWeekTable({
  data,
  onSelect,
  selected = null,
  highlightDate,
}: WorkoutWeekTableProps) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {data.map((day) => {
        const isHighlighted = Boolean(highlightDate && highlightDate === day.date);
        const isDaySelected = Boolean(selected?.date === day.date && selected?.selectionType === "day");
        const isSlotSelected = Boolean(selected?.date === day.date && selected?.selectionType === "slot");
        const isSelectedAny = isDaySelected || isSlotSelected;

        const selectionBg = token.colorPrimaryBgHover;

        const cardBorderColor = isSelectedAny
          ? token.colorPrimary
          : isHighlighted
            ? token.colorPrimaryBorder
            : undefined;
        const cardBackground = isSelectedAny
          ? selectionBg
          : isHighlighted
            ? token.colorPrimaryBg
            : undefined;
        const cardBorderWidth = isSelectedAny ? 2 : 1;

        return (
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
                <Typography.Text strong style={{ color: isSelectedAny ? token.colorPrimaryText : undefined }}>
                  {day.weekdayLabel}
                  {selected?.date === day.date && selected?.selectionType === "day" ? "（已选）" : ""}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {day.date}
                </Typography.Text>
              </Space>
            </div>
          }
          style={{
            width: "100%",
            borderColor: cardBorderColor,
            borderWidth: cardBorderWidth,
            background: cardBackground,
            borderLeft: isSelectedAny ? `6px solid ${token.colorPrimary}` : undefined,
          }}
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
                (() => {
                  const isSlotRowSelected =
                    selected?.date === day.date &&
                    selected?.selectionType === "slot" &&
                    selected?.slotType === slot.key;

                  return (
                <div
                  key={slot.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "52px 1fr",
                    gap: 8,
                    alignItems: "start",
                    background: isSlotRowSelected ? token.colorPrimaryBgHover : undefined,
                    border: isSlotRowSelected ? `1px solid ${token.colorPrimaryBorder}` : undefined,
                    borderRadius: isSlotRowSelected ? 12 : undefined,
                    padding: isSlotRowSelected ? 8 : undefined,
                    borderLeft: isSlotRowSelected ? `4px solid ${token.colorPrimary}` : undefined,
                  }}
                >
                  <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: "20px" }}>
                    {slot.label}
                  </Typography.Text>
                  <div style={{ lineHeight: "20px" }}>
                    {renderValueButton(rawValue, day.date, slot.key, onSelect, selected, token)}
                  </div>
                </div>
                  );
                })()
              );
            })}
          </Space>
          </Card>
        );
      })}
    </div>
  );
}
