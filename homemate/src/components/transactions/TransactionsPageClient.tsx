"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Space, Typography, message } from "antd";
import dayjs from "dayjs";
import type { Transaction, UserCategory } from "@/types/transactions";
import { getTransactionsData, removeTransaction, saveTransaction } from "@/app/transactions/actions";
import TransactionsFilters, {
  type TransactionsFilterValues,
} from "@/components/transactions/TransactionsFilters";
import TransactionsList from "@/components/transactions/TransactionsList";
import TransactionsSummary from "@/components/transactions/TransactionsSummary";
import TransactionModal, {
  type TransactionFormValues,
} from "@/components/transactions/TransactionModal";

interface TransactionsPageClientProps {
  initialTransactions: Transaction[];
  initialCategories: UserCategory[];
}

export default function TransactionsPageClient({
  initialTransactions,
  initialCategories,
}: TransactionsPageClientProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [categories, setCategories] = useState<UserCategory[]>(initialCategories);
  const [filters, setFilters] = useState<TransactionsFilterValues>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  const refreshData = (nextFilters: TransactionsFilterValues = filters) => {
    startTransition(async () => {
      const { transactions: nextTransactions, categories: nextCategories } =
        await getTransactionsData(nextFilters);
      setTransactions(nextTransactions);
      setCategories(nextCategories);
      setFilters(nextFilters);
    });
  };

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((transaction) => {
      const amount = Number(transaction.amount_base ?? transaction.amount ?? 0);
      if (transaction.type === "income") income += amount;
      else expense += amount;
    });
    return { income, expense, net: income - expense };
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
    const totalsMap = new Map<string, number>();
    transactions.forEach((transaction) => {
      if (transaction.type !== "expense") return;
      const name = transaction.category_id
        ? categoryMap.get(transaction.category_id) ?? "未分类"
        : "未分类";
      const amount = Number(transaction.amount_base ?? transaction.amount ?? 0);
      totalsMap.set(name, (totalsMap.get(name) ?? 0) + amount);
    });
    return Array.from(totalsMap.entries()).map(([name, value]) => ({ name, value }));
  }, [categories, transactions]);

  const trendData = useMemo(() => {
    const buckets = new Map<string, { income: number; expense: number }>();
    transactions.forEach((transaction) => {
      const dateKey = dayjs(transaction.occurred_at).format("YYYY-MM-DD");
      if (!buckets.has(dateKey)) {
        buckets.set(dateKey, { income: 0, expense: 0 });
      }
      const bucket = buckets.get(dateKey)!;
      const amount = Number(transaction.amount_base ?? transaction.amount ?? 0);
      if (transaction.type === "income") bucket.income += amount;
      else bucket.expense += amount;
    });

    return Array.from(buckets.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, values]) => ({ day: dayjs(day).format("MM/DD"), ...values }));
  }, [transactions]);

  const handleApplyFilters = (nextFilters: TransactionsFilterValues) => {
    refreshData(nextFilters);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditing(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = (transaction: Transaction) => {
    startTransition(async () => {
      await removeTransaction(transaction.id);
      refreshData(filters);
    });
  };

  const handleSubmit = (values: TransactionFormValues) => {
    startTransition(async () => {
      const { rateMissing } = await saveTransaction(values);
      if (rateMissing) {
        message.warning("没有找到汇率，已按原币种保存");
      }
      setIsModalOpen(false);
      setEditing(undefined);
      refreshData(filters);
    });
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Space align="center" style={{ justifyContent: "space-between" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          记账
        </Typography.Title>
        <Button type="primary" onClick={() => setIsModalOpen(true)}>
          + 添加记录
        </Button>
      </Space>

      <TransactionsSummary totals={totals} categoryBreakdown={categoryBreakdown} trendData={trendData} />
      <TransactionsFilters categories={categories} onApply={handleApplyFilters} />
      <TransactionsList
        transactions={transactions}
        categories={categories}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <TransactionModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditing(undefined);
        }}
        onSubmit={handleSubmit}
        categories={categories}
        initialValues={editing}
      />

      {isPending ? <Typography.Text type="secondary">更新中...</Typography.Text> : null}
    </div>
  );
}
