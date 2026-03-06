"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import HeaderBar from "./HeaderBar";
import SideNav from "./SideNav";
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
    <div className="min-h-screen bg-transparent px-3 pb-4 pt-3">
      <HeaderBar />
      <div className="flex gap-4 bg-transparent">
        {isProfileRoute ? null : <SideNav />}
        <main className="relative min-h-[calc(100vh-108px)] flex-1 overflow-hidden rounded-2xl border border-[#bed4ed] bg-white/75 p-5 backdrop-blur">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <img
              src="/decor-dots.svg"
              alt=""
              className="absolute -right-8 top-3 w-[140px] opacity-30"
            />
            <img
              src="/decor-cloud.svg"
              alt=""
              className="absolute -left-14 bottom-0 w-[240px] opacity-22"
            />
            <img
              src="/decor-cloud.svg"
              alt=""
              className="absolute right-10 -bottom-16 w-[220px] -rotate-12 opacity-16"
            />
            <img
              src="/decor-dots.svg"
              alt=""
              className="absolute left-20 top-8 w-[86px] opacity-22"
            />
            <img
              src="/decor-dots.svg"
              alt=""
              className="absolute right-1/3 bottom-10 w-[96px] opacity-18"
            />
            <div className="absolute -left-6 top-1/3 h-24 w-24 rounded-full bg-[#d8ebff]/42 blur-2xl" />
            <div className="absolute right-20 top-1/2 h-20 w-20 rounded-full bg-[#c8ddf7]/40 blur-2xl" />
            <div className="absolute bottom-8 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full bg-[#deeeff]/44 blur-xl" />
            <div className="absolute left-7 top-24 rounded-full border border-[#d4e6fa] bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-[#7da0c8]">
              ✦ cozy
            </div>
            <div className="absolute bottom-6 right-10 rounded-full border border-[#d4e6fa] bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-[#7da0c8]">
              ✦ calm
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellContent>{children}</ShellContent>
    </AuthProvider>
  );
}
