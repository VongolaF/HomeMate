"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { REMEMBER_ME_KEY, SESSION_STARTED_AT_KEY } from "@/lib/auth/constants";

type ProfileRow = {
  username: string | null;
  display_name: string | null;
};

export default function HeaderBar() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;
      setProfile((data as ProfileRow) ?? null);
    };

    const loadAvatar = async () => {
      if (!user) return;
      const path = `${user.id}/avatar.png`;
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 10);
      if (!isMounted) return;
      setAvatarUrl(data?.signedUrl ?? null);
    };

    fetchProfile();
    loadAvatar();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuWrapperRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const displayName = useMemo(() => {
    if (!user) return null;
    if (profile?.display_name) return profile.display_name;
    if (profile?.username) return profile.username;
    return user.email?.split("@")?.[0] ?? "用户";
  }, [profile?.display_name, profile?.username, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(REMEMBER_ME_KEY);
      window.localStorage.removeItem(SESSION_STARTED_AT_KEY);
    }
  };

  return (
    <header className="relative z-40 pb-3">
      <div className="relative flex w-full items-center justify-between rounded-2xl border border-[#bed4ed] bg-white/85 px-5 py-3.5 shadow-soft backdrop-blur">
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl">
          <img
            src="/decor-cloud.svg"
            alt=""
            className="absolute -right-24 -top-14 w-[180px] opacity-12"
          />
          <img
            src="/decor-dots.svg"
            alt=""
            className="absolute left-52 top-2 w-[76px] opacity-10"
          />
          <img
            src="/decor-cloud.svg"
            alt=""
            className="absolute -left-10 -bottom-10 w-[160px] rotate-6 opacity-28"
          />
          <img
            src="/decor-dots.svg"
            alt=""
            className="absolute right-40 bottom-0 w-[72px] opacity-20"
          />
          <div className="absolute left-1/2 top-0 h-20 w-20 -translate-x-1/2 rounded-full bg-[#d9e9fb]/45 blur-2xl" />
        </div>
        <div className="relative z-10 rounded-lg border border-[#c7daef] bg-white/78 px-2.5 py-0.5">
          <h1 className="m-0 select-none text-[31px] font-bold tracking-[0.03em] text-[#1f466f] sm:text-[35px]">
            HomeMate
          </h1>
        </div>
        {user && displayName ? (
          <div className="relative z-10" ref={menuWrapperRef}>
            <button
              className="flex cursor-pointer items-center gap-2 rounded-full border border-[#c9dbef] bg-[#edf4fc] px-2.5 py-1 text-[#355070]"
              onClick={() => setMenuOpen((value) => !value)}
              type="button"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="h-8 w-8 rounded-full border border-[#b7cde7] object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7aa7d9] text-sm font-semibold text-white">
                  {displayName.slice(0, 1)}
                </div>
              )}
              <span className="font-semibold">{displayName}</span>
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-12 z-[80] min-w-40 rounded-xl border border-[#d5e3f3] bg-white p-1 shadow-soft">
                <Link
                  href="/profile"
                  className="block rounded-lg px-3 py-2 text-sm text-[#355070] hover:bg-[#eef4fb]"
                  onClick={() => setMenuOpen(false)}
                >
                  个人中心
                </Link>
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#355070] hover:bg-[#eef4fb]"
                  onClick={handleLogout}
                >
                  退出登录
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
