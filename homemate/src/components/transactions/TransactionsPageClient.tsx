"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Button, Space, Typography, message } from "antd";
import dayjs from "dayjs";
import type { Transaction, UserCategory } from "@/types/transactions";
import {
  disableCategory,
  getTransactionsData,
  removeTransaction,
  saveCategory,
  saveTransaction,
} from "@/app/transactions/actions";
import TransactionsFilters, {
  type TransactionsFilterValues,
} from "@/components/transactions/TransactionsFilters";
import TransactionsList from "@/components/transactions/TransactionsList";
import TransactionsSummary from "@/components/transactions/TransactionsSummary";
import TransactionModal, {
  type TransactionFormValues,
} from "@/components/transactions/TransactionModal";
import CategoryManager, {
  type CategoryFormValues,
} from "@/components/transactions/CategoryManager";

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
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);

  const refreshData = (nextFilters: TransactionsFilterValues = filters) => {
    const currentRequest = ++requestId.current;
    startTransition(async () => {
      try {
        const { transactions: nextTransactions, categories: nextCategories } =
          await getTransactionsData(nextFilters);
        if (currentRequest !== requestId.current) return;
        setTransactions(nextTransactions);
        setCategories(nextCategories);
        setFilters(nextFilters);
      } catch (error) {
        if (currentRequest !== requestId.current) return;
        message.error("加载失败，请稍后再试");
      }
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
      try {
        await removeTransaction(transaction.id);
        refreshData(filters);
      } catch (error) {
        message.error("删除失败，请稍后再试");
      }
    });
  };

  const handleSubmit = (values: TransactionFormValues) => {
    startTransition(async () => {
      try {
        const { rateMissing } = await saveTransaction(values);
        if (rateMissing) {
          message.warning("没有找到汇率，已按原币种保存");
        }
        setIsModalOpen(false);
        setEditing(undefined);
        refreshData(filters);
      } catch (error) {
        message.error("保存失败，请稍后再试");
      }
    });
  };

  const handleSaveCategory = (values: CategoryFormValues) => {
    startTransition(async () => {
      try {
        await saveCategory(values);
        refreshData(filters);
      } catch (error) {
        message.error("分类保存失败，请稍后再试");
      }
    });
  };

  const handleDeactivateCategory = (categoryId: string) => {
    startTransition(async () => {
      try {
        await disableCategory(categoryId);
        refreshData(filters);
      } catch (error) {
        message.error("分类停用失败，请稍后再试");
      }
    });
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Space align="center" style={{ justifyContent: "space-between" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          记账
        </Typography.Title>
        <Space>
          <Button onClick={() => setIsCategoryOpen(true)} disabled={isPending}>
            分类管理
          </Button>
          <Button type="primary" onClick={() => setIsModalOpen(true)} disabled={isPending}>
            + 添加记录
          </Button>
        </Space>
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

      <CategoryManager
        open={isCategoryOpen}
        onClose={() => setIsCategoryOpen(false)}
        categories={categories}
        onSave={handleSaveCategory}
        onDeactivate={handleDeactivateCategory}
      />

      {isPending ? <Typography.Text type="secondary">更新中...</Typography.Text> : null}
    </div>
  );
}
