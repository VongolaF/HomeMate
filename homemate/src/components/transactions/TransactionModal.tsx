"use client";

import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
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

interface LocalForm {
  type: "income" | "expense";
  amount: string;
  currency: string;
  occurred_at: string;
  category_id: string;
  note: string;
  tags: string;
}

function toLocalForm(initialValues?: Transaction): LocalForm {
  return {
    type: initialValues?.type ?? "expense",
    amount: String(initialValues?.amount ?? ""),
    currency: initialValues?.currency ?? "CNY",
    occurred_at: initialValues?.occurred_at
      ? dayjs(initialValues.occurred_at).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD"),
    category_id: initialValues?.category_id ?? "",
    note: initialValues?.note ?? "",
    tags: Array.isArray(initialValues?.tags) ? initialValues?.tags.join(",") : "",
  };
}

export default function TransactionModal({
  open,
  onClose,
  onSubmit,
  categories,
  initialValues,
}: TransactionModalProps) {
  const [form, setForm] = useState<LocalForm>(toLocalForm(initialValues));
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(toLocalForm(initialValues));
    setErrorText(null);
  }, [open, initialValues]);

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.amount || Number(form.amount) <= 0) {
      setErrorText("请输入有效金额");
      return;
    }
    if (!form.currency.trim()) {
      setErrorText("请选择币种");
      return;
    }
    if (!form.occurred_at.trim()) {
      setErrorText("请选择日期");
      return;
    }

    onSubmit({
      type: form.type,
      amount: Number(form.amount),
      currency: form.currency,
      occurred_at: form.occurred_at,
      category_id: form.category_id || null,
      note: form.note.trim() || "",
      tags: form.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <form
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-soft"
        onSubmit={handleSubmit}
      >
        <h3 className="mb-3 text-lg font-semibold text-ink">
          {initialValues ? "修改这笔记录" : "记一笔收支"}
        </h3>

        {errorText ? (
          <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorText}
          </p>
        ) : null}

        <div className="grid gap-3">
          <label className="grid gap-1 text-sm text-ink">
            <span className="text-muted">类型</span>
            <select
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as "income" | "expense" }))}
              className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
            >
              <option value="expense">支出</option>
              <option value="income">收入</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm text-ink">
            <span className="text-muted">金额</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
              required
            />
          </label>

          <label className="grid gap-1 text-sm text-ink">
            <span className="text-muted">币种</span>
            <select
              value={form.currency}
              onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
              className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
            >
              <option value="CNY">CNY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm text-ink">
            <span className="text-muted">日期</span>
            <input
              type="date"
              value={form.occurred_at}
              onChange={(event) => setForm((prev) => ({ ...prev, occurred_at: event.target.value }))}
              className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
              required
            />
          </label>

          <label className="grid gap-1 text-sm text-ink">
            <span className="text-muted">分类</span>
            <select
              value={form.category_id}
              onChange={(event) => setForm((prev) => ({ ...prev, category_id: event.target.value }))}
              className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
            >
              <option value="">未分类</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm text-ink">
            <span className="text-muted">标签（逗号分隔）</span>
            <input
              type="text"
              value={form.tags}
              onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
              className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
              placeholder="如：通勤, 三餐"
            />
          </label>

          <label className="grid gap-1 text-sm text-ink">
            <span className="text-muted">备注</span>
            <textarea
              rows={3}
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              className="rounded-xl border border-line px-3 py-2 outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink"
          >
            先不填
          </button>
          <button type="submit" className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white">
            保存一下
          </button>
        </div>
      </form>
    </div>
  );
}
