import type * as React from "react";
import Link from "next/link";

export default function AuthGate({
  user,
  loading,
  children,
}: {
  user: { id: string } | null;
  loading?: boolean;
  children: React.ReactNode;
}) {
  if (loading) return <div style={{ padding: 24 }}>加载中...</div>;
  if (!user) {
    return (
      <div className="p-6">
        <div className="mb-3 text-ink">请先登录</div>
        <Link href="/login">
          <button
            type="button"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
          >
            去登录看看
          </button>
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
