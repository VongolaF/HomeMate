"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button, Space, Typography, message } from "antd";
import type { Transaction, UserCategory } from "@/types/transactions";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
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
  initialTransactions?: Transaction[];
  initialCategories?: UserCategory[];
}

export default function TransactionsPageClient({
  initialTransactions,
  initialCategories,
}: TransactionsPageClientProps) {
  const { user, loading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions ?? []);
  const [categories, setCategories] = useState<UserCategory[]>(initialCategories ?? []);
  const [filters, setFilters] = useState<TransactionsFilterValues>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);

  const getExchangeRate = async (
    rateDate: string,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number | null> => {
    if (fromCurrency === toCurrency) return 1;

    const dateOnly = rateDate.split("T")[0];
    const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateOnly);
    if (!isValidFormat) return null;

    const parsedDate = new Date(`${dateOnly}T00:00:00Z`);
    if (Number.isNaN(parsedDate.getTime())) return null;
    if (parsedDate.toISOString().slice(0, 10) !== dateOnly) return null;

    const { data, error } = await supabase
      .from("exchange_rates")
      .select("rate")
      .eq("rate_date", dateOnly)
      .eq("from_currency", fromCurrency)
      .eq("to_currency", toCurrency)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const rate = Number(data.rate);
    return Number.isFinite(rate) ? rate : null;
  };

  const refreshData = (nextFilters: TransactionsFilterValues = filters) => {
    if (!user) return;
    const currentRequest = ++requestId.current;
    startTransition(async () => {
      try {
        let transactionsQuery = supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id);

        if (nextFilters.startDate) {
          transactionsQuery = transactionsQuery.gte("occurred_at", nextFilters.startDate);
        }
        if (nextFilters.endDate) {
          transactionsQuery = transactionsQuery.lte("occurred_at", nextFilters.endDate);
        }
        if (nextFilters.type) {
          transactionsQuery = transactionsQuery.eq("type", nextFilters.type);
        }
        if (Array.isArray(nextFilters.categoryIds) && nextFilters.categoryIds.length) {
          transactionsQuery = transactionsQuery.in("category_id", nextFilters.categoryIds);
        }
        if (nextFilters.minAmount !== undefined) {
          transactionsQuery = transactionsQuery.gte("amount_base", nextFilters.minAmount);
        }
        if (nextFilters.maxAmount !== undefined) {
          transactionsQuery = transactionsQuery.lte("amount_base", nextFilters.maxAmount);
        }
        if (Array.isArray(nextFilters.tags) && nextFilters.tags.length) {
          transactionsQuery = transactionsQuery.overlaps("tags", nextFilters.tags);
        }

        const [{ data: nextTransactions, error: transactionsError }, { data: nextCategories, error: categoriesError }] =
          await Promise.all([
            transactionsQuery.order("occurred_at", { ascending: false }),
            supabase
              .from("user_categories")
              .select("*")
              .eq("user_id", user.id)
              .order("sort_order", { ascending: true }),
          ]);

        if (transactionsError) throw transactionsError;
        if (categoriesError) throw categoriesError;
        if (currentRequest !== requestId.current) return;
        setTransactions((nextTransactions ?? []) as Transaction[]);
        setCategories((nextCategories ?? []) as UserCategory[]);
        setFilters(nextFilters);
      } catch (error) {
        if (currentRequest !== requestId.current) return;
        message.error("加载失败，请稍后再试");
      }
    });
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setTransactions([]);
      setCategories([]);
      return;
    }
    refreshData(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.is_active),
    [categories]
  );

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


  const handleApplyFilters = (nextFilters: TransactionsFilterValues) => {
    refreshData(nextFilters);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditing(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = (transaction: Transaction) => {
    if (!user) return;
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("id", transaction.id)
          .eq("user_id", user.id);
        if (error) throw error;
        refreshData(filters);
      } catch (error) {
        message.error("删除失败，请稍后再试");
      }
    });
  };

  const handleSubmit = (values: TransactionFormValues) => {
    if (!user) return;
    startTransition(async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("base_currency")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        const baseCurrency = profile?.base_currency ?? values.currency;
        const rate = await getExchangeRate(values.occurred_at, values.currency, baseCurrency);
        const amount_base =
          rate === null ? Number(values.amount) : Number(values.amount) * Number(rate);

        const payload = {
          ...values,
          id: editing?.id,
          user_id: user.id,
          category_id: values.category_id ?? null,
          tags: values.tags ?? null,
          amount_base,
        };

        const { error } = await supabase
          .from("transactions")
          .upsert(payload)
          .select("*")
          .single();
        if (error) throw error;
        const rateMissing = rate === null;
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
    if (!user) return;
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("user_categories")
          .upsert({
            ...values,
            user_id: user.id,
            icon: values.icon ?? null,
          })
          .select("*")
          .single();
        if (error) throw error;
        refreshData(filters);
      } catch (error) {
        message.error("分类保存失败，请稍后再试");
      }
    });
  };

  const handleDeactivateCategory = (categoryId: string) => {
    if (!user) return;
    startTransition(async () => {
      try {
        const { error } = await supabase
          .from("user_categories")
          .update({ is_active: false })
          .eq("id", categoryId)
          .eq("user_id", user.id);
        if (error) throw error;
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

      <TransactionsSummary totals={totals} />
      <TransactionsFilters categories={activeCategories} onApply={handleApplyFilters} />
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
        categories={activeCategories}
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
