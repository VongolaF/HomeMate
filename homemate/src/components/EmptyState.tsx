"use client";

export default function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-primarySoft/40 px-4 py-6 text-center">
      <div className="mb-1 text-sm font-medium text-muted">( ˘͈ ᵕ ˘͈ )</div>
      <div className="text-sm text-ink">{title}</div>
    </div>
  );
}
