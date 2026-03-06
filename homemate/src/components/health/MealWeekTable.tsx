"use client";

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
  selected: MealWeekTableProps["selected"] | undefined
) => {
  const isSelected =
    selected?.date === date && selected?.selectionType === "slot" && selected?.slotType === slotType;
  const display = value?.trim() ? value : "-";

  return (
    <button
      type="button"
      onClick={() => onSelect({ date, selectionType: "slot", slotType })}
      className={`block w-full rounded-lg text-left text-sm leading-relaxed transition ${
        isSelected
          ? "border border-sky-300 bg-sky-50 px-2 py-1 font-semibold text-primary"
          : "px-0 py-0 font-normal text-ink"
      }`}
      aria-current={isSelected ? "true" : undefined}
    >
      {display}
    </button>
  );
};

export default function MealWeekTable({
  data,
  onSelect,
  selected = null,
  highlightDate,
}: MealWeekTableProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {data.map((day) => {
        const isHighlighted = Boolean(highlightDate && highlightDate === day.date);
        const isDaySelected = Boolean(selected?.date === day.date && selected?.selectionType === "day");
        const isSlotSelected = Boolean(selected?.date === day.date && selected?.selectionType === "slot");
        const isSelectedAny = isDaySelected || isSlotSelected;

        return (
          <article
            key={day.date}
            className={`rounded-2xl border bg-panel p-3 shadow-soft ${
              isSelectedAny
                ? "border-2 border-primary bg-sky-50"
                : isHighlighted
                ? "border-sky-300 bg-sky-50/70"
                : "border-line"
            }`}
          >
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
              className="cursor-pointer"
            >
              <div className="grid gap-0.5">
                <p className={`text-sm font-semibold ${isSelectedAny ? "text-primary" : "text-ink"}`}>
                  {day.weekdayLabel}
                  {selected?.date === day.date && selected?.selectionType === "day" ? "（已选）" : ""}
                </p>
                <p className="text-xs text-muted">{day.date}</p>
              </div>
            </div>

          <div className="mt-3 grid gap-2.5">
            {mealSlots.map((slot) => (
              (() => {
                const isSlotRowSelected =
                  selected?.date === day.date &&
                  selected?.selectionType === "slot" &&
                  selected?.slotType === slot.key;

                return (
              <div
                key={slot.key}
                className={`grid grid-cols-[52px_1fr] items-start gap-2 rounded-xl ${
                  isSlotRowSelected ? "border border-sky-300 bg-sky-50 p-2" : ""
                }`}
              >
                <p className="text-xs leading-5 text-muted">{slot.label}</p>
                <div className="leading-5">
                  {renderValueButton(
                    day[slot.key],
                    day.date,
                    slot.key,
                    onSelect,
                    selected
                  )}
                </div>
              </div>
                );
              })()
            ))}
          </div>
          </article>
        );
      })}
    </div>
  );
}
