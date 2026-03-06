"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/ui/cn";

const items = [
  { key: "home", icon: "🏠", label: "首页", href: "/" },
  { key: "transactions", icon: "💳", label: "记账", href: "/transactions" },
  { key: "analytics", icon: "📊", label: "统计报表", href: "/analytics" },
  { key: "events", icon: "📅", label: "日历提醒", href: "/events" },
  { key: "health", icon: "💪", label: "健康管理", href: "/health" },
  { key: "savings", icon: "🐷", label: "存钱目标", href: "/savings" },
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
    <aside
      className={cn(
        "sticky top-3 h-[calc(100vh-12px)] self-start overflow-auto rounded-2xl border border-[#bed4ed] bg-white/85 p-3 shadow-soft backdrop-blur transition-[width] duration-200",
        collapsed ? "w-20" : "w-60"
      )}
    >
      <div className="mb-2 flex justify-start px-1">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[#355070] hover:bg-[#eef4fb]"
          aria-label={collapsed ? "展开侧边" : "收起侧边"}
        >
          {collapsed ? "➡️" : "⬅️"}
          {collapsed ? null : " 收起侧边栏"}
        </button>
      </div>
      <nav className="grid gap-1">
        {items.map((item) => {
          const isActive = selectedKey === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm font-medium text-[#355070] transition-colors",
                isActive ? "bg-[#eaf2fc]" : "hover:bg-[#eef4fb]"
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className="mr-2 text-base">{item.icon}</span>
              {collapsed ? null : item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
