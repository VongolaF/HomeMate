import type * as React from "react";
import Link from "next/link";
import { Button } from "antd";

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
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>请先登录</div>
        <Link href="/login">
          <Button type="primary">去登录</Button>
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
