"use client";

import { useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Select, Space, Switch, Table } from "antd";
import type { UserCategory } from "@/types/transactions";

export interface CategoryFormValues {
  id?: string;
  name: string;
  icon?: string | null;
  type: "income" | "expense";
  sort_order?: number;
  is_active?: boolean;
}

interface CategoryManagerProps {
  open: boolean;
  onClose: () => void;
  categories: UserCategory[];
  onSave: (values: CategoryFormValues) => void;
  onDeactivate: (categoryId: string) => void;
}

export default function CategoryManager({
  open,
  onClose,
  categories,
  onSave,
  onDeactivate,
}: CategoryManagerProps) {
  const [form] = Form.useForm<CategoryFormValues>();
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEdit = (category: UserCategory) => {
    setEditingId(category.id);
    form.setFieldsValue({
      id: category.id,
      name: category.name,
      icon: category.icon ?? "",
      type: category.type,
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
  };

  const handleFinish = (values: CategoryFormValues) => {
    onSave({
      ...values,
      id: editingId ?? values.id,
      icon: values.icon || null,
    });
    setEditingId(null);
    form.resetFields();
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      render: (value: string) => (value === "income" ? "收入" : "支出"),
    },
    {
      title: "排序",
      dataIndex: "sort_order",
      key: "sort_order",
    },
    {
      title: "启用",
      dataIndex: "is_active",
      key: "is_active",
      render: (value: boolean) => <Switch checked={value} disabled />,
    },
    {
      title: "操作",
      key: "actions",
      render: (_: unknown, record: UserCategory) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            size="small"
            danger
            onClick={() => onDeactivate(record.id)}
            disabled={!record.is_active}
          >
            停用
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title="分类管理"
      open={open}
      onCancel={() => {
        setEditingId(null);
        form.resetFields();
        onClose();
      }}
      footer={null}
      width={760}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16 }}>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="分类名称" />
          </Form.Item>
          <Form.Item label="类型" name="type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "expense", label: "支出" },
                { value: "income", label: "收入" },
              ]}
            />
          </Form.Item>
          <Form.Item label="排序" name="sort_order">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <Form.Item label="图标" name="icon">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item label="启用" name="is_active" initialValue={true}>
            <Switch defaultChecked />
          </Form.Item>
        </div>
        <Space>
          <Button type="primary" htmlType="submit">
            {editingId ? "更新" : "新增"}
          </Button>
          <Button
            onClick={() => {
              setEditingId(null);
              form.resetFields();
            }}
          >
            清空
          </Button>
        </Space>
      </Form>

      <div style={{ marginTop: 24 }}>
        <Table
          rowKey="id"
          dataSource={categories}
          columns={columns}
          pagination={false}
          size="small"
        />
      </div>
    </Modal>
  );
}
