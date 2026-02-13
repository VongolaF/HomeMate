"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, Dropdown, Layout, Space, Typography, message } from "antd";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { REMEMBER_ME_KEY } from "@/lib/auth/constants";

type ProfileRow = {
  username: string | null;
  display_name: string | null;
};

export default function HeaderBar() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
    }
    message.success("已退出登录");
  };

  return (
    <Layout.Header
      style={{
        background: "transparent",
        padding: "12px 0",
        height: "auto",
      }}
    >
      <div
        style={{
          background: "#fff7f9",
          borderRadius: 16,
          padding: "12px 20px",
          border: "1px solid #f4dbe4",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography.Title level={3} style={{ margin: 0, color: "#e64576" }}>
          HomeMate
        </Typography.Title>
        {user && displayName ? (
          <Dropdown
            menu={{
              items: [
                {
                  key: "profile",
                  label: <Link href="/profile">个人中心</Link>,
                },
                { type: "divider" },
                {
                  key: "logout",
                  label: "退出登录",
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <Space style={{ cursor: "pointer" }}>
              <Avatar size={32} src={avatarUrl || undefined}>
                {displayName.slice(0, 1)}
              </Avatar>
              <Typography.Text style={{ color: "#6b1b3b" }}>
                {displayName}
              </Typography.Text>
            </Space>
          </Dropdown>
        ) : null}
      </div>
    </Layout.Header>
  );
}
