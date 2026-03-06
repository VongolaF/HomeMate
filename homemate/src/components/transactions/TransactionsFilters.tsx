"use client";

import { useMemo, useState } from "react";
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

export default function TransactionsFilters({ categories, onApply }: TransactionsFiltersProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<"" | "income" | "expense">("");
  const [categoryId, setCategoryId] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [tagsText, setTagsText] = useState("");

  const activeCategories = useMemo(
    () => categories.filter((category) => category.is_active),
    [categories]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      type: type || undefined,
      categoryIds: categoryId ? [categoryId] : undefined,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
      tags: tagsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setType("");
    setCategoryId("");
    setMinAmount("");
    setMaxAmount("");
    setTagsText("");
    onApply({});
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
      <h3 className="mb-3 text-base font-semibold text-ink">筛选</h3>
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <label className="grid gap-1 text-sm text-ink">
            <span className="text-muted">开始日期</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
            />
          </label>

          <label className="grid gap-1 text-sm text-ink">
            <span className="text-muted">结束日期</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
            />
          </label>

          <label className="grid gap-1 text-sm text-ink">
            <span className="text-muted">类型</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as "" | "income" | "expense")}
              className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
            >
              <option value="">全部</option>
              <option value="income">收入</option>
              <option value="expense">支出</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <label className="grid gap-1 text-sm text-ink">
            <span className="text-muted">分类</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
            >
              <option value="">全部分类</option>
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {(category.icon ?? "").trim() ? `${category.icon} ${category.name}` : category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm text-ink">
            <span className="text-muted">最小金额</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minAmount}
              onChange={(event) => setMinAmount(event.target.value)}
              className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
              placeholder="0"
            />
          </label>

          <label className="grid gap-1 text-sm text-ink">
            <span className="text-muted">最大金额</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxAmount}
              onChange={(event) => setMaxAmount(event.target.value)}
              className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
              placeholder="不限"
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm text-ink">
          <span className="text-muted">标签（逗号分隔）</span>
          <input
            type="text"
            value={tagsText}
            onChange={(event) => setTagsText(event.target.value)}
            className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
            placeholder="如：吃饭, 通勤"
          />
        </label>

        <div className="flex gap-2">
          <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white" type="submit">
            开始筛选
          </button>
          <button
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink"
            type="button"
            onClick={handleReset}
          >
            清空筛选
          </button>
        </div>
      </form>
    </section>
  );
}
