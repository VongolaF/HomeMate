"use client";

import { useEffect, useState } from "react";
import packageJson from "../../../package.json";

type ChangeLogItem = {
  version: string;
  date: string;
  content: string;
};

type AboutAndPreferencesPanelProps = {
  onNotice?: (message: string) => void;
};

const HAPTICS_KEY = "hm_haptics_enabled";
const SUPPORT_EMAIL = "support@homemate.app";
const SUPPORT_PHONE = "400-800-8899";
const CHANGELOG: ChangeLogItem[] = [
  {
    version: "v1.0.0",
    date: "2026-03-08",
    content: "上线 BLACKPINK 主题、快捷创建、编辑与删除流程。",
  },
  {
    version: "v0.9.0",
    date: "2026-02-28",
    content: "完成首页概览、日历提醒、记账与存钱目标基础能力。",
  },
];

export default function AboutAndPreferencesPanel({ onNotice }: AboutAndPreferencesPanelProps) {
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const localValue = window.localStorage.getItem(HAPTICS_KEY);
    if (localValue === null) {
      window.localStorage.setItem(HAPTICS_KEY, "true");
      setHapticsEnabled(true);
      return;
    }
    setHapticsEnabled(localValue === "true");
  }, []);

  const handleToggleHaptics = () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HAPTICS_KEY, next ? "true" : "false");
    }
    onNotice?.(next ? "已开启交互反馈" : "已关闭交互反馈");
  };

  const handleCopySupportEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      onNotice?.("反馈邮箱已复制");
    } catch {
      onNotice?.("复制失败，请手动复制邮箱");
    }
  };

  return (
    <section className="rounded-2xl border-2 border-line bg-panel p-4 shadow-soft">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-white/80 p-3">
          <h3 className="text-base font-semibold text-ink">关于 HomeMate</h3>
          <p className="mt-1 text-sm text-muted">当前版本 v{packageJson.version}</p>
          <div className="mt-3 grid gap-2">
            {CHANGELOG.map((item) => (
              <div key={item.version} className="rounded-lg border border-line bg-white px-3 py-2">
                <p className="text-sm font-semibold text-ink">
                  {item.version} · {item.date}
                </p>
                <p className="mt-1 text-xs text-muted">{item.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white/80 p-3">
          <h3 className="text-base font-semibold text-ink">偏好与支持</h3>
          <div className="mt-3 grid gap-2">
            <div className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-ink">交互震动反馈</p>
                <p className="text-xs text-muted">用于移动端滑动交互提示</p>
              </div>
              <button
                type="button"
                onClick={handleToggleHaptics}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  hapticsEnabled ? "bg-primary text-white" : "border border-line text-ink"
                }`}
              >
                {hapticsEnabled ? "已开启" : "已关闭"}
              </button>
            </div>

            <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-muted">
              <p>反馈邮箱：{SUPPORT_EMAIL}</p>
              <p className="mt-1">支持电话：{SUPPORT_PHONE}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleCopySupportEmail}
                  className="rounded-lg border border-line px-2 py-1 text-xs text-ink"
                >
                  复制邮箱
                </button>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="rounded-lg border border-line px-2 py-1 text-xs text-ink"
                >
                  发邮件
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
