"use client";

import { useEffect, useState } from "react";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Avatar, Button, Card, Descriptions, Form, Input, Upload, message } from "antd";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { REMEMBER_ME_KEY } from "@/lib/auth/constants";

type ProfileRow = {
  id: string;
  display_name: string | null;
  base_currency: string | null;
  role: string | null;
  username: string | null;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, base_currency, role, username")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;
      if (error || !data) {
        message.error("加载个人信息失败");
        setLoading(false);
        return;
      }

      setProfile(data as ProfileRow);
      form.setFieldsValue({
        username: data.username ?? "",
        display_name: data.display_name ?? "",
        base_currency: data.base_currency ?? "CNY",
      });
      await loadAvatar(user.id);
      setLoading(false);
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [user, form]);

  const loadAvatar = async (userId: string) => {
    const path = `${userId}/avatar.png`;
    const { data, error } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) {
      setAvatarUrl(null);
      return;
    }
    setAvatarUrl(data.signedUrl);
  };

  const handleSave = async (values: {
    username?: string;
    display_name?: string;
    base_currency?: string;
  }) => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: values.username?.trim() || null,
        display_name: values.display_name?.trim() || null,
        base_currency: values.base_currency?.trim() || "CNY",
      })
      .eq("id", user.id);

    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        message.error("用户名已存在");
      } else {
        message.error("保存失败");
      }
      return;
    }
    message.success("保存成功");
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return false;
    setUploading(true);
    const path = `${user.id}/avatar.png`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type,
    });

    setUploading(false);
    if (error) {
      message.error("上传失败");
      return false;
    }
    await loadAvatar(user.id);
    message.success("头像已更新");
    return false;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(REMEMBER_ME_KEY);
    }
    message.success("已退出登录");
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <Button
          aria-label="返回首页"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/")}
        >
          返回首页
        </Button>
      </div>
      <Card title="个人中心" loading={loading}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="用户名">{profile?.username || "-"}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{user?.email || "-"}</Descriptions.Item>
          <Descriptions.Item label="角色">{profile?.role || "user"}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="基础信息" loading={loading}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="头像" extra="支持 PNG/JPG，建议正方形">
            <Upload
              showUploadList={false}
              accept="image/*"
              beforeUpload={handleAvatarUpload}
            >
              <Avatar size={72} src={avatarUrl || undefined}>
                {profile?.username?.slice(0, 1) || "U"}
              </Avatar>
            </Upload>
          </Form.Item>
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              {
                pattern: /^[A-Za-z0-9_.-]{3,20}$/,
                message: "3-20 位，支持字母数字_.-",
              },
            ]}
          >
            <Input placeholder="用户名" />
          </Form.Item>
          <Form.Item label="昵称" name="display_name">
            <Input placeholder="昵称" />
          </Form.Item>
          <Form.Item label="默认币种" name="base_currency">
            <Input placeholder="CNY" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading || uploading}>
            保存
          </Button>
          <Button style={{ marginLeft: 12 }} onClick={handleLogout}>
            退出登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
