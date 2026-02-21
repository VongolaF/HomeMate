"use client";

import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Segmented } from "antd";
import type { Transaction, UserCategory } from "@/types/transactions";

export interface TransactionFormValues {
  type: "income" | "expense";
  amount: number;
  currency: string;
  occurred_at: string;
  category_id?: string | null;
  note?: string;
  tags?: string[];
}

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TransactionFormValues) => void;
  categories: UserCategory[];
  initialValues?: Transaction;
}

interface FormValues {
  type: "income" | "expense";
  amount: number;
  currency: string;
  occurred_at: Dayjs;
  category_id?: string | null;
  note?: string;
  tags?: string[];
}

export default function TransactionModal({
  open,
  onClose,
  onSubmit,
  categories,
  initialValues,
}: TransactionModalProps) {
  const [form] = Form.useForm<FormValues>();

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit({
      ...values,
      occurred_at: values.occurred_at.format("YYYY-MM-DD"),
    });
  };

  const typeValue = Form.useWatch("type", form) ?? initialValues?.type ?? "expense";
  const filteredCategories = categories.filter((category) => category.type === typeValue);

  return (
    <Modal
      title={initialValues ? "编辑记账" : "新增记账"}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="submit" type="primary" onClick={handleOk}>
          保存
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: initialValues?.type ?? "expense",
          amount: initialValues?.amount ?? 0,
          currency: initialValues?.currency ?? "CNY",
          occurred_at: initialValues?.occurred_at
            ? dayjs(initialValues.occurred_at)
            : dayjs(),
          category_id: initialValues?.category_id ?? undefined,
          note: initialValues?.note ?? "",
          tags: initialValues?.tags ?? [],
        }}
      >
        <Form.Item label="类型" name="type" rules={[{ required: true }]}>
          <Segmented
            options={[
              { label: "支出", value: "expense" },
              { label: "收入", value: "income" },
            ]}
          />
        </Form.Item>
        <Form.Item label="金额" name="amount" rules={[{ required: true, type: "number", min: 0.01 }]}>
          <InputNumber min={0.01} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="币种" name="currency" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "CNY", label: "CNY" },
              { value: "USD", label: "USD" },
              { value: "EUR", label: "EUR" },
            ]}
          />
        </Form.Item>
        <Form.Item label="日期" name="occurred_at" rules={[{ required: true }]}>
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="分类" name="category_id">
          <Select
            allowClear
            placeholder="选择分类"
            options={filteredCategories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
          />
        </Form.Item>
        <Form.Item label="标签" name="tags">
          <Select mode="tags" placeholder="输入标签" />
        </Form.Item>
        <Form.Item label="备注" name="note">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
