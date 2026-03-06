"use client";

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
  selected: WorkoutWeekTableProps["selected"] | undefined
) => {
  const isSelected =
    selected?.date === date && selected?.selectionType === "slot" && selected?.slotType === slotType;
  const display = value === null || value === undefined || value === "" ? "-" : String(value);

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
      {slotType === "duration" && display !== "-" ? `${display} 分钟` : display}
    </button>
  );
};

export default function WorkoutWeekTable({
  data,
  onSelect,
  selected = null,
  highlightDate,
}: WorkoutWeekTableProps) {
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
                  className={`grid grid-cols-[52px_1fr] items-start gap-2 rounded-xl ${
                    isSlotRowSelected ? "border border-sky-300 bg-sky-50 p-2" : ""
                  }`}
                >
                  <p className="text-xs leading-5 text-muted">{slot.label}</p>
                  <div className="leading-5">
                    {renderValueButton(rawValue, day.date, slot.key, onSelect, selected)}
                  </div>
                </div>
                  );
                })()
              );
            })}
          </div>
          </article>
        );
      })}
    </div>
  );
}
