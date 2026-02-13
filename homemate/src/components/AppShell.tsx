"use client";

import { Layout } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import HeaderBar from "./HeaderBar";
import SideNav from "./SideNav";
import AuthGate from "./AuthGate";
import { AuthProvider, useAuth } from "./AuthProvider";

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isProfileRoute = pathname.startsWith("/profile");

  useEffect(() => {
    if (loading) return;
    if (!user && !pathname.startsWith("/login")) {
      router.replace("/login");
      return;
    }
    if (user && pathname.startsWith("/login")) {
      router.replace("/");
    }
  }, [loading, pathname, router, user]);

  if (pathname.startsWith("/login")) {
    return <>{children}</>;
  }

  if (!user) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#fff1f7" }}>
      <HeaderBar />
      <Layout style={{ background: "#fff1f7" }}>
        {isProfileRoute ? null : <SideNav />}
        <Layout.Content style={{ padding: 24, background: "transparent" }}>
          {children}
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellContent>{children}</ShellContent>
    </AuthProvider>
  );
}
