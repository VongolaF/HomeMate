"use client";

import { Button, Table, Typography } from "antd";

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
  onSelect: (selection: { date: string; slotType: MealSlot }) => void;
};

const renderCell = (
  value: string | null | undefined,
  date: string,
  slotType: MealSlot,
  onSelect: MealWeekTableProps["onSelect"]
) => (
  <Button type="link" size="small" onClick={() => onSelect({ date, slotType })}>
    {value || "-"}
  </Button>
);

export default function MealWeekTable({ data, onSelect }: MealWeekTableProps) {
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
          title: "早餐",
          dataIndex: "breakfast",
          key: "breakfast",
          render: (value, record) => renderCell(value, record.date, "breakfast", onSelect),
        },
        {
          title: "午餐",
          dataIndex: "lunch",
          key: "lunch",
          render: (value, record) => renderCell(value, record.date, "lunch", onSelect),
        },
        {
          title: "晚餐",
          dataIndex: "dinner",
          key: "dinner",
          render: (value, record) => renderCell(value, record.date, "dinner", onSelect),
        },
        {
          title: "加餐",
          dataIndex: "snacks",
          key: "snacks",
          render: (value, record) => renderCell(value, record.date, "snacks", onSelect),
        },
      ]}
    />
  );
}
