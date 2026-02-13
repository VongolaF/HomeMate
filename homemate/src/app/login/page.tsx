"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Checkbox, Form, Input, Modal, Tabs, Typography, message } from "antd";
import { supabase } from "@/lib/supabase/client";
import { REMEMBER_ME_KEY } from "@/lib/auth/constants";

const normalizeText = (value: string) => value.trim();

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetForm] = Form.useForm();

  const handleLogin = async (values: {
    email: string;
    password: string;
    remember: boolean;
  }) => {
    setLoading(true);

    const email = normalizeText(values.email);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        REMEMBER_ME_KEY,
        values.remember ? "true" : "false"
      );
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: values.password,
    });

    setLoading(false);
      if (error) {
        message.error("邮箱或密码不正确");
        return;
      }
    message.success("登录成功");
    router.push("/");
  };

  const handleRegister = async (values: {
    email: string;
    username: string;
    password: string;
    display_name?: string;
  }) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: normalizeText(values.email),
      password: values.password,
      options: {
        data: {
          username: normalizeText(values.username),
          display_name: values.display_name?.trim() || null,
        },
      },
    });

    setLoading(false);
    if (error) {
      message.error(error.message || "注册失败");
      return;
    }

    message.success("注册成功，请登录");
  };

  const handleResetPassword = async (values: { email: string }) => {
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setResetLoading(false);
    if (error) {
      message.error("发送失败，请稍后再试");
      return;
    }
    message.success("重置邮件已发送");
    setResetOpen(false);
    resetForm.resetFields();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#fff3f7",
      }}
    >
      <Card style={{ width: 360 }}>
        <Typography.Title level={3} style={{ marginBottom: 0 }}>
          HomeMate
        </Typography.Title>
        <Typography.Text type="secondary">欢迎使用</Typography.Text>
        <Tabs
          defaultActiveKey="login"
          items={[
            {
              key: "login",
              label: "登录",
              children: (
                <Form
                  layout="vertical"
                  onFinish={handleLogin}
                  initialValues={{ remember: true }}
                  style={{ marginTop: 16 }}
                >
                  <Form.Item
                    label="邮箱"
                    name="email"
                    rules={[
                      { required: true, message: "请输入邮箱" },
                      { type: "email", message: "邮箱格式不正确" },
                    ]}
                  >
                    <Input placeholder="邮箱" autoComplete="email" />
                  </Form.Item>
                  <Form.Item
                    label="密码"
                    name="password"
                    rules={[{ required: true, message: "请输入密码" }]}
                  >
                    <Input.Password placeholder="密码" autoComplete="current-password" />
                  </Form.Item>
                  <Form.Item name="remember" valuePropName="checked">
                    <Checkbox>记住我</Checkbox>
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block loading={loading}>
                    登录
                  </Button>
                  <Button
                    type="link"
                    onClick={() => setResetOpen(true)}
                    style={{ paddingLeft: 0 }}
                  >
                    忘记密码？
                  </Button>
                </Form>
              ),
            },
            {
              key: "register",
              label: "注册",
              children: (
                <Form layout="vertical" onFinish={handleRegister} style={{ marginTop: 16 }}>
                  <Form.Item
                    label="邮箱"
                    name="email"
                    rules={[
                      { required: true, message: "请输入邮箱" },
                      { type: "email", message: "邮箱格式不正确" },
                    ]}
                  >
                    <Input placeholder="邮箱" autoComplete="email" />
                  </Form.Item>
                  <Form.Item
                    label="用户名"
                    name="username"
                    rules={[
                      { required: true, message: "请输入用户名" },
                      {
                        pattern: /^[A-Za-z0-9_.-]{3,20}$/,
                        message: "3-20 位，支持字母数字_.-",
                      },
                    ]}
                  >
                    <Input placeholder="用户名" autoComplete="username" />
                  </Form.Item>
                  <Form.Item label="昵称" name="display_name">
                    <Input placeholder="昵称（可选）" autoComplete="name" />
                  </Form.Item>
                  <Form.Item
                    label="密码"
                    name="password"
                    rules={[{ required: true, message: "请输入密码" }]}
                  >
                    <Input.Password placeholder="密码" autoComplete="new-password" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" block loading={loading}>
                    注册
                  </Button>
                </Form>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        open={resetOpen}
        title="重置密码"
        okText="发送"
        cancelText="取消"
        confirmLoading={resetLoading}
        onCancel={() => setResetOpen(false)}
        onOk={() => resetForm.submit()}
      >
        <Form form={resetForm} layout="vertical" onFinish={handleResetPassword}>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "邮箱格式不正确" },
            ]}
          >
            <Input placeholder="邮箱" autoComplete="email" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
