"use client";

import { Button, Table, Typography } from "antd";

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
  onSelect: (selection: { date: string; slotType: WorkoutSlot }) => void;
};

const renderCell = (
  value: string | number | null | undefined,
  date: string,
  slotType: WorkoutSlot,
  onSelect: WorkoutWeekTableProps["onSelect"]
) => (
  <Button type="link" size="small" onClick={() => onSelect({ date, slotType })}>
    {value ?? "-"}
  </Button>
);

export default function WorkoutWeekTable({ data, onSelect }: WorkoutWeekTableProps) {
  return (
    <Table
      size="small"
      pagination={false}
      dataSource={data.map((item) => ({ ...item, key: item.date }))}
      columns={[
        {
          title: "日期",
          dataIndex: "weekdayLabel",
          key: "weekdayLabel",
          render: (_, record) => (
            <Typography.Text>{`${record.weekdayLabel} ${record.date}`}</Typography.Text>
          ),
        },
        {
          title: "有氧",
          dataIndex: "cardio",
          key: "cardio",
          render: (value, record) => renderCell(value, record.date, "cardio", onSelect),
        },
        {
          title: "无氧",
          dataIndex: "strength",
          key: "strength",
          render: (value, record) => renderCell(value, record.date, "strength", onSelect),
        },
        {
          title: "时长(min)",
          dataIndex: "duration_min",
          key: "duration_min",
          render: (value, record) => renderCell(value, record.date, "duration", onSelect),
        },
        {
          title: "备注",
          dataIndex: "notes",
          key: "notes",
          render: (value, record) => renderCell(value, record.date, "notes", onSelect),
        },
      ]}
    />
  );
}
