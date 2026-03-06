"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { REMEMBER_ME_KEY, SESSION_STARTED_AT_KEY } from "@/lib/auth/constants";

type LoginForm = {
  email: string;
  password: string;
  remember: boolean;
};

type RegisterForm = {
  email: string;
  username: string;
  display_name: string;
  password: string;
};

const normalizeText = (value: string) => value.trim();

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: "",
    password: "",
    remember: true,
  });

  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    email: "",
    username: "",
    display_name: "",
    password: "",
  });

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorText(null);
    setSuccessText(null);
    setLoading(true);

    const email = normalizeText(loginForm.email);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(REMEMBER_ME_KEY, loginForm.remember ? "true" : "false");
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: loginForm.password,
    });

    setLoading(false);
    if (error) {
      setErrorText("邮箱或密码不正确");
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()));
    }

    setSuccessText("登录成功，正在进入首页…");
    router.push("/");
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorText(null);
    setSuccessText(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: normalizeText(registerForm.email),
      password: registerForm.password,
      options: {
        data: {
          username: normalizeText(registerForm.username),
          display_name: registerForm.display_name.trim() || null,
        },
      },
    });

    setLoading(false);
    if (error) {
      setErrorText(error.message || "注册失败");
      return;
    }

    setSuccessText("注册成功，请登录");
    setTab("login");
  };

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorText(null);
    setSuccessText(null);

    if (!resetEmail.trim()) {
      setErrorText("请输入邮箱");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);

    if (error) {
      setErrorText("发送失败，请稍后再试");
      return;
    }

    setSuccessText("重置邮件已发送");
    setShowReset(false);
    setResetEmail("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-6 py-8">
      <div className="w-full max-w-[400px] rounded-3xl border border-line bg-surface p-6 shadow-soft">
        <h1 className="mb-1 text-3xl font-bold text-ink">HomeMate</h1>
        <p className="mb-6 text-sm text-muted">欢迎回来，开始管理你的家庭生活</p>

        <div className="mb-5 grid grid-cols-2 rounded-xl bg-primarySoft p-1">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === "login" ? "bg-white text-ink shadow" : "text-muted"
            }`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => setTab("register")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === "register" ? "bg-white text-ink shadow" : "text-muted"
            }`}
          >
            注册
          </button>
        </div>

        {errorText ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</div>
        ) : null}
        {successText ? (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{successText}</div>
        ) : null}

        {tab === "login" ? (
          <form className="grid gap-3" onSubmit={handleLogin}>
            <input
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              type="email"
              placeholder="邮箱"
              value={loginForm.email}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <input
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              type="password"
              placeholder="密码"
              value={loginForm.password}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={loginForm.remember}
                onChange={(event) =>
                  setLoginForm((prev) => ({ ...prev, remember: event.target.checked }))
                }
              />
              记住我
            </label>
            <button
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={loading}
            >
              {loading ? "登录中…" : "开始登录"}
            </button>
            <button
              type="button"
              onClick={() => setShowReset(true)}
              className="justify-self-start text-sm text-primary hover:underline"
            >
              忘记密码？
            </button>
          </form>
        ) : (
          <form className="grid gap-3" onSubmit={handleRegister}>
            <input
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              type="email"
              placeholder="邮箱"
              value={registerForm.email}
              onChange={(event) =>
                setRegisterForm((prev) => ({ ...prev, email: event.target.value }))
              }
              required
            />
            <input
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              type="text"
              placeholder="用户名"
              value={registerForm.username}
              onChange={(event) =>
                setRegisterForm((prev) => ({ ...prev, username: event.target.value }))
              }
              required
            />
            <input
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              type="text"
              placeholder="昵称（可选）"
              value={registerForm.display_name}
              onChange={(event) =>
                setRegisterForm((prev) => ({ ...prev, display_name: event.target.value }))
              }
            />
            <input
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              type="password"
              placeholder="密码"
              value={registerForm.password}
              onChange={(event) =>
                setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
              }
              required
            />
            <button
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={loading}
            >
              {loading ? "创建中…" : "创建账号"}
            </button>
          </form>
        )}
      </div>

      {showReset ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <form
            onSubmit={handleResetPassword}
            className="w-full max-w-sm rounded-2xl border border-line bg-white p-5 shadow-soft"
          >
            <h2 className="mb-2 text-lg font-semibold text-ink">重置密码</h2>
            <p className="mb-4 text-sm text-muted">输入邮箱后，我们会发送重置邮件。</p>
            <input
              className="mb-4 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              type="email"
              placeholder="邮箱"
              value={resetEmail}
              onChange={(event) => setResetEmail(event.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReset(false)}
                className="rounded-xl border border-line px-3 py-2 text-sm text-ink"
              >
                取消
              </button>
              <button
                type="submit"
                className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white"
                disabled={loading}
              >
                {loading ? "发送中…" : "发送邮件"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
