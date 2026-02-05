import type * as React from "react";

export default function AuthGate({
  user,
  children,
}: {
  user: { id: string } | null;
  children: React.ReactNode;
}) {
  if (!user) return <div style={{ padding: 24 }}>请先登录</div>;
  return <>{children}</>;
}
