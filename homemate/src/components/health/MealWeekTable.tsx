"use client";

import { Button, Card, Space, Typography, theme } from "antd";

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
  highlightDate?: string;
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
  selected: MealWeekTableProps["selected"] | undefined,
  token: ReturnType<typeof theme.useToken>["token"]
) => {
  const isSelected =
    selected?.date === date && selected?.selectionType === "slot" && selected?.slotType === slotType;
  const display = value?.trim() ? value : "-";

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
      {display}
    </Button>
  );
};

export default function MealWeekTable({
  data,
  onSelect,
  selected = null,
  highlightDate,
}: MealWeekTableProps) {
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
            {mealSlots.map((slot) => (
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
                  {renderValueButton(
                    day[slot.key],
                    day.date,
                    slot.key,
                    onSelect,
                    selected,
                    token
                  )}
                </div>
              </div>
                );
              })()
            ))}
          </Space>
          </Card>
        );
      })}
    </div>
  );
}
