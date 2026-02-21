"use client";

import type { Dayjs } from "dayjs";
import { Button, Card, DatePicker, Form, InputNumber, Select, Space } from "antd";
import type { UserCategory } from "@/types/transactions";

export interface TransactionsFilterValues {
  startDate?: string;
  endDate?: string;
  type?: "income" | "expense";
  categoryIds?: string[];
  minAmount?: number;
  maxAmount?: number;
  tags?: string[];
}

interface TransactionsFiltersProps {
  categories: UserCategory[];
  onApply: (values: TransactionsFilterValues) => void;
}

interface FiltersFormValues {
  dateRange?: [Dayjs, Dayjs];
  type?: "income" | "expense";
  categoryIds?: string[];
  minAmount?: number;
  maxAmount?: number;
  tags?: string[];
}

export default function TransactionsFilters({ categories, onApply }: TransactionsFiltersProps) {
  const [form] = Form.useForm<FiltersFormValues>();

  const handleFinish = (values: FiltersFormValues) => {
    const [start, end] = values.dateRange ?? [];
    onApply({
      startDate: start?.format("YYYY-MM-DD"),
      endDate: end?.format("YYYY-MM-DD"),
      type: values.type,
      categoryIds: values.categoryIds,
      minAmount: values.minAmount,
      maxAmount: values.maxAmount,
      tags: values.tags,
    });
  };

  const handleReset = () => {
    form.resetFields();
    onApply({});
  };

  return (
    <Card size="small" title="筛选">
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <Form.Item label="日期范围" name="dateRange">
            <DatePicker.RangePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="类型" name="type">
            <Select
              allowClear
              placeholder="全部"
              options={[
                { value: "income", label: "收入" },
                { value: "expense", label: "支出" },
              ]}
            />
          </Form.Item>
          <Form.Item label="分类" name="categoryIds">
            <Select
              allowClear
              mode="multiple"
              placeholder="选择分类"
              options={categories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
            />
          </Form.Item>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <Form.Item label="最小金额" name="minAmount">
            <InputNumber min={0} style={{ width: "100%" }} placeholder="0" />
          </Form.Item>
          <Form.Item label="最大金额" name="maxAmount">
            <InputNumber min={0} style={{ width: "100%" }} placeholder="不限" />
          </Form.Item>
          <Form.Item label="标签" name="tags">
            <Select mode="tags" placeholder="输入标签" />
          </Form.Item>
        </div>
        <Space>
          <Button type="primary" htmlType="submit">
            应用筛选
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Form>
    </Card>
  );
}
