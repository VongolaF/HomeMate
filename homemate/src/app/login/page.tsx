"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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

type VisualTheme = {
  badge: string;
  title: string;
  subtitle: string;
  mascotTitle: string;
  mascotSubtitle: string;
};

const VISUAL_THEMES: Record<string, VisualTheme> = {
  default: {
    badge: "智能家庭管理平台",
    title: "HomeMate",
    subtitle: "在一个工作台里管理账单、日程、健康和家庭目标。",
    mascotTitle: "今天也要轻松管理家庭事务",
    mascotSubtitle: "和可爱的家庭小助手一起，让记录、计划和协作都变简单。",
  },
  savings: {
    badge: "家庭财务助手",
    title: "HomeMate Savings",
    subtitle: "实时跟踪支出节奏与储蓄目标，让每月计划更清晰。",
    mascotTitle: "小金库正在稳步成长",
    mascotSubtitle: "让每一笔记录都更有意义，用温和节奏达成你的长期目标。",
  },
};

const getVisualTheme = (): VisualTheme => {
  const activeThemeKey = process.env.NEXT_PUBLIC_LOGIN_VISUAL_THEME || "default";
  return VISUAL_THEMES[activeThemeKey] || VISUAL_THEMES.default;
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

  const visualTheme = getVisualTheme();
  const floatingCharacters = [
    {
      src: "/pig-svgrepo-com.svg",
      alt: "pig buddy",
      className: "app-float-character-left app-float-fast app-float-soft app-float-character-reverse absolute left-[7%] top-[30%] h-16 w-16 md:h-24 md:w-24",
      style: { animationDelay: "120ms" },
    },
    {
      src: "/rabbit-svgrepo-com.svg",
      alt: "rabbit buddy",
      className: "app-float-character-right app-float-soft absolute right-[9%] top-[40%] h-16 w-16 md:h-24 md:w-24",
      style: { animationDelay: "260ms" },
    },
    {
      src: "/husky-svgrepo-com.svg",
      alt: "husky buddy",
      className: "app-float-character-left app-float-slow app-float-soft absolute bottom-[24%] right-[7%] h-14 w-14 md:h-16 md:w-16",
      style: undefined,
    },
    {
      src: "/penguin-svgrepo-com.svg",
      alt: "penguin buddy",
      className: "app-float-character-right app-float-fast app-float-soft app-float-character-reverse absolute right-[36%] top-[14%] hidden h-20 w-20 rotate-6 md:block md:h-24 md:w-24",
      style: undefined,
    },
    {
      src: "/rabbit-svgrepo-com.svg",
      alt: "rabbit buddy",
      className: "app-float-character-left app-float-slow app-float-soft absolute left-[42%] bottom-[8%] hidden h-20 w-20 -rotate-6 md:block",
      style: undefined,
    },
  ] as const;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-page md:min-h-screen md:grid md:grid-cols-3">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-6 top-6 opacity-85 md:left-12 md:top-10">
          <Image src="/decor-cloud.svg" alt="cloud" width={126} height={56} />
        </div>
        <div className="absolute right-4 top-20 opacity-75 md:right-[18%] md:top-10">
          <Image src="/decor-cloud.svg" alt="cloud" width={104} height={46} />
        </div>
        <div className="absolute bottom-10 left-4 opacity-80 md:left-[34%] md:bottom-12">
          <Image src="/decor-dots.svg" alt="dots" width={100} height={50} />
        </div>

        {floatingCharacters.map((character, index) => (
          <div key={`${character.src}-${index}`} className={character.className} style={character.style}>
            <Image src={character.src} alt={character.alt} width={96} height={96} className="h-full w-full" />
          </div>
        ))}

        <div className="absolute left-[22%] top-[56%] h-3 w-3 rounded-full bg-primary/40 animate-pulse" style={{ animationDuration: "5s" }} />
        <div className="absolute left-[24%] top-[62%] h-2 w-2 rounded-full bg-primary/35 animate-pulse" style={{ animationDuration: "5.8s" }} />
        <div className="absolute right-[24%] top-[68%] h-3.5 w-3.5 rounded-full bg-primary/30 animate-pulse" style={{ animationDuration: "5.4s" }} />
      </div>

      <section className="relative z-10 hidden overflow-hidden border-r border-line bg-primarySoft md:col-span-2 md:flex md:flex-col md:justify-between md:p-10 lg:p-14">
        <div className="relative z-10 max-w-xl">
          <p className="mb-3 inline-flex rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted">
            {visualTheme.badge}
          </p>
          <h1 className="text-4xl font-bold leading-tight text-ink lg:text-5xl">{visualTheme.title}</h1>
          <p className="mt-4 text-base text-muted lg:text-lg">{visualTheme.subtitle}</p>
        </div>

        <div className="relative z-10 mt-10 max-w-3xl">
          <p className="text-lg font-semibold text-ink">{visualTheme.mascotTitle}</p>
          <p className="mt-2 max-w-lg text-sm text-muted">{visualTheme.mascotSubtitle}</p>
        </div>

        <div className="pointer-events-none absolute inset-0">
          <div className="app-float-character-left app-float-soft absolute left-8 top-24 h-24 w-24 md:h-28 md:w-28">
            <Image src="/pig-svgrepo-com.svg" alt="pig buddy" width={96} height={96} className="h-full w-full" />
          </div>
          <div
            className="app-float-character-right app-float-character-reverse app-float-soft absolute right-16 top-[36%] h-20 w-20 md:h-24 md:w-24"
            style={{ animationDelay: "180ms" }}
          >
            <Image src="/rabbit-svgrepo-com.svg" alt="rabbit buddy" width={80} height={80} className="h-full w-full" />
          </div>
          <div
            className="app-float-character-left app-float-slow app-float-soft absolute left-[32%] bottom-14 h-[4.5rem] w-[4.5rem] md:h-20 md:w-20"
            style={{ animationDelay: "320ms" }}
          >
            <Image src="/husky-svgrepo-com.svg" alt="husky buddy" width={64} height={64} className="h-full w-full" />
          </div>

          <div className="absolute left-8 top-8 opacity-90">
            <Image src="/decor-cloud.svg" alt="cloud" width={140} height={64} />
          </div>
          <div className="absolute right-10 top-20 opacity-75">
            <Image src="/decor-cloud.svg" alt="cloud" width={112} height={50} />
          </div>
          <div className="absolute -left-20 top-10 h-56 w-56 rounded-full border border-primary/30 bg-surface/60 animate-pulse" />
          <div className="absolute bottom-10 right-16 h-36 w-36 rounded-full border border-primary/40 bg-surface/60 animate-pulse" style={{ animationDelay: "300ms" }} />
        </div>
      </section>

      <section className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6 py-8 md:col-span-1 md:min-h-screen md:bg-page/50">
        <div className="relative w-full max-w-[420px] rounded-3xl border border-line bg-surface/95 p-6 shadow-soft backdrop-blur-sm">
          <div
            className="app-float-character-right app-float-fast app-float-character-reverse pointer-events-none absolute -left-5 -top-5 h-12 w-12"
            style={{ animationDelay: "80ms" }}
          >
            <Image src="/pig-svgrepo-com.svg" alt="pig buddy" width={48} height={48} className="h-full w-full" />
          </div>
          <div
            className="app-float-character-left pointer-events-none absolute -right-5 -top-5 h-12 w-12"
            style={{ animationDelay: "220ms" }}
          >
            <Image src="/penguin-svgrepo-com.svg" alt="penguin buddy" width={48} height={48} className="h-full w-full" />
          </div>

          <h2 className="mb-1 text-3xl font-bold text-ink">HomeMate</h2>
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
      </section>

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
