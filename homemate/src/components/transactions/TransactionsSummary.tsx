"use client";

export interface SummaryTotals {
  income: number;
  expense: number;
  net: number;
}

interface TransactionsSummaryProps {
  totals: SummaryTotals;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">¥{value.toFixed(2)}</p>
    </div>
  );
}

export default function TransactionsSummary({ totals }: TransactionsSummaryProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
      <SummaryCard label="当前筛选收入" value={totals.income} />
      <SummaryCard label="当前筛选支出" value={totals.expense} />
      <SummaryCard label="当前筛选结余" value={totals.net} />
    </div>
  );
}
