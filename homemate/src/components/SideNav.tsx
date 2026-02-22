"use client";

import { useState } from "react";
import { Button, Layout, Menu } from "antd";
import {
  PieChartOutlined,
  CalendarOutlined,
  ProfileOutlined,
  WalletOutlined,
  DashboardOutlined,
  HeartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { key: "home", icon: <DashboardOutlined />, label: "首页", href: "/" },
  { key: "transactions", icon: <WalletOutlined />, label: "记账", href: "/transactions" },
  { key: "analytics", icon: <PieChartOutlined />, label: "统计报表", href: "/analytics" },
  { key: "events", icon: <CalendarOutlined />, label: "日历提醒", href: "/events" },
  { key: "health", icon: <HeartOutlined />, label: "健康管理", href: "/health" },
  { key: "savings", icon: <ProfileOutlined />, label: "存钱目标", href: "/savings" },
];

const pathToKey = (pathname: string) => {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/transactions")) return "transactions";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/events")) return "events";
  if (pathname.startsWith("/health")) return "health";
  if (pathname.startsWith("/savings")) return "savings";
  return "home";
};

export default function SideNav() {
  const pathname = usePathname();
  const selectedKey = pathToKey(pathname);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout.Sider
      width={220}
      collapsible={false}
      collapsed={collapsed}
      collapsedWidth={72}
      style={{
        background: "#ffffff",
        borderRadius: 16,
        boxShadow: "0 8px 20px rgba(0, 0, 0, 0.06)",
        padding: "12px 8px",
        marginRight: 16,
           position: "sticky",
           top: 0,
           height: "100vh",
        alignSelf: "flex-start",
        overflow: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-start", padding: "0 4px 8px" }}>
        <Button
          type="text"
          onClick={() => setCollapsed((value) => !value)}
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          aria-label={collapsed ? "展开侧边" : "收起侧边"}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8 }}
        >
          {collapsed ? null : "收起侧边栏"}
        </Button>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={items.map((item) => ({
          key: item.key,
          icon: item.icon,
          label: <Link href={item.href}>{item.label}</Link>,
        }))}
        inlineCollapsed={collapsed}
        style={{ background: "transparent", borderRight: 0 }}
      />
    </Layout.Sider>
  );
}
