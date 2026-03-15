"use client";

import packageJson from "../../../package.json";

const SUPPORT_EMAIL = "vongolaf925@outlook.com";
const SUPPORT_PHONE = "400-800-8899";

export default function AboutAndPreferencesPanel() {
  return (
    <section className="rounded-2xl border-2 border-line bg-panel p-4 shadow-soft">
      <div className="rounded-xl border border-line bg-white/80 p-3">
        <h3 className="text-base font-semibold text-ink">关于 HomeMate</h3>
        <p className="mt-1 text-sm text-muted">家庭生活管理工具，帮助你统一管理记账、日历、健康和储蓄目标。</p>

        <div className="mt-4 border-t border-line pt-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm font-semibold text-ink">当前版本 v{packageJson.version}</p>
            <div className="text-sm text-muted sm:text-right">
              <p>反馈邮箱：{SUPPORT_EMAIL}</p>
              <p className="mt-1">支持电话：{SUPPORT_PHONE}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
