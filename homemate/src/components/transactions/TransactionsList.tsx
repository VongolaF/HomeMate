"use client";

import { Button, Card, Empty, Popconfirm, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { Transaction, UserCategory } from "@/types/transactions";

interface TransactionsListProps {
  transactions: Transaction[];
  categories: UserCategory[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

export default function TransactionsList({
  transactions,
  categories,
  onEdit,
  onDelete,
}: TransactionsListProps) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, transaction) => {
    const key = transaction.occurred_at;
    if (!acc[key]) acc[key] = [];
    acc[key].push(transaction);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  return (
    <Card title="记账明细">
      {transactions.length === 0 ? (
        <Empty description="暂无记账记录" />
      ) : (
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          {dates.map((date) => {
            const items = grouped[date];
            let income = 0;
            let expense = 0;
            items.forEach((item) => {
              const amount = Number(item.amount_base ?? item.amount ?? 0);
              if (item.type === "income") income += amount;
              else expense += amount;
            });
            const subtotal = income - expense;
            const subtotalText = `${subtotal < 0 ? "-" : ""}¥${Math.abs(subtotal).toFixed(2)}`;
            return (
              <div key={date} style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: 16 }}>
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                  <Typography.Text strong>{dayjs(date).format("YYYY-MM-DD")}</Typography.Text>
                  <Typography.Text type="secondary">合计 {subtotalText}</Typography.Text>
                </Space>
                <Space orientation="vertical" size={12} style={{ width: "100%", marginTop: 12 }}>
                  {items.map((item) => {
                    const category = item.category_id ? categoryMap.get(item.category_id) : null;
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 12,
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <Space>
                            <Typography.Text strong>
                              {category?.name ?? "未分类"}
                            </Typography.Text>
                            <Tag color={item.type === "expense" ? "volcano" : "blue"}>
                              {item.type === "expense" ? "支出" : "收入"}
                            </Tag>
                          </Space>
                          {item.note ? (
                            <Typography.Paragraph style={{ margin: "4px 0 0" }}>
                              {item.note}
                            </Typography.Paragraph>
                          ) : null}
                          {item.tags?.length ? (
                            <Space size={4} wrap>
                              {item.tags.map((tag) => (
                                <Tag key={tag}>{tag}</Tag>
                              ))}
                            </Space>
                          ) : null}
                        </div>
                        <Space>
                          <Typography.Text>
                            {item.type === "expense" ? "-" : "+"}¥
                            {Number(item.amount_base ?? item.amount ?? 0).toFixed(2)}
                          </Typography.Text>
                          {onEdit ? <Button onClick={() => onEdit(item)}>编辑</Button> : null}
                          {onDelete ? (
                            <Popconfirm
                              title="确认删除这条记录吗？"
                              okText="删除"
                              cancelText="取消"
                              onConfirm={() => onDelete(item)}
                            >
                              <Button danger>删除</Button>
                            </Popconfirm>
                          ) : null}
                        </Space>
                      </div>
                    );
                  })}
                </Space>
              </div>
            );
          })}
        </Space>
      )}
    </Card>
  );
}
