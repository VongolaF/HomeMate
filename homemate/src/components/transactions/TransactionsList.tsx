"use client";

import dayjs from "dayjs";
import type { Transaction, UserCategory } from "@/types/transactions";
import EmptyState from "@/components/EmptyState";

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
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <h3 className="mb-3 text-lg font-semibold text-ink">记账明细</h3>

      {transactions.length === 0 ? (
        <EmptyState title="暂无记账记录" />
      ) : (
        <div className="grid gap-4">
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
              <div key={date} className="rounded-xl border border-line bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{dayjs(date).format("YYYY-MM-DD")}</p>
                  <p className="text-sm text-muted">合计 {subtotalText}</p>
                </div>

                <div className="grid gap-3">
                  {items.map((item) => {
                    const category = item.category_id ? categoryMap.get(item.category_id) : null;
                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-line/70 pt-3 first:border-t-0 first:pt-0 max-md:grid-cols-1"
                      >
                        <div>
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink">{category?.name ?? "未分类"}</span>
                            <span className="rounded-full bg-primarySoft px-2 py-0.5 text-xs text-ink">
                              {item.type === "expense" ? "支出" : "收入"}
                            </span>
                          </div>
                          {item.note ? <p className="text-sm text-ink/85">{item.note}</p> : null}
                          {item.tags?.length ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.tags.map((tag) => (
                                <span key={tag} className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2 max-md:justify-end">
                          <span className="text-sm font-semibold text-[#4f77a8]">
                            {item.type === "expense" ? "-" : "+"}¥
                            {Number(item.amount_base ?? item.amount ?? 0).toFixed(2)}
                          </span>
                          {onEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(item)}
                              className="rounded-lg border border-line px-2 py-1 text-xs text-ink"
                            >
                              改一下
                            </button>
                          ) : null}
                          {onDelete ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm("确认删除这条记录吗？")) onDelete(item);
                              }}
                              className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600"
                            >
                              移除
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
