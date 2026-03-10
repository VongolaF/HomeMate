"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import PageHeader from "@/components/PageHeader";
import AboutAndPreferencesPanel from "@/components/profile/AboutAndPreferencesPanel";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { REMEMBER_ME_KEY, SESSION_STARTED_AT_KEY } from "@/lib/auth/constants";

type ProfileRow = {
  id: string;
  display_name: string | null;
  base_currency: string | null;
  username: string | null;
  phone: string | null;
};

type BodyMetricsRow = {
  user_id: string;
  height_cm: number | null;
  weight_kg: number | null;
  gender: string | null;
  birthday: string | null;
  age: number | null;
  body_fat_pct: number | null;
  muscle_pct: number | null;
  subcutaneous_fat: number | null;
  visceral_fat: number | null;
  bmi: number | null;
  water_pct: number | null;
  protein_pct: number | null;
  bone_mass: number | null;
  bmr: number | null;
};

type BasicForm = {
  display_name: string;
  username: string;
  phone: string;
  base_currency: string;
};

type BodyForm = {
  height_cm: string;
  weight_kg: string;
  gender: string;
  birthday: string;
  body_fat_pct: string;
  muscle_pct: string;
  subcutaneous_fat: string;
  visceral_fat: string;
  water_pct: string;
  protein_pct: string;
  bone_mass: string;
  bmr: string;
};

const MAX_AVATAR_SIZE_MB = 5;
const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

const toNumberOrNull = (value: string) => {
  if (!value.trim()) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const currencies = ["CNY", "USD", "EUR", "JPY", "HKD", "GBP"];

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "body">("basic");

  const [bodyLoading, setBodyLoading] = useState(false);
  const [bodySaving, setBodySaving] = useState(false);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricsRow | null>(null);

  const [notice, setNotice] = useState<string | null>(null);
  const [basicForm, setBasicForm] = useState<BasicForm>({
    display_name: "",
    username: "",
    phone: "",
    base_currency: "CNY",
  });
  const [bodyForm, setBodyForm] = useState<BodyForm>({
    height_cm: "",
    weight_kg: "",
    gender: "",
    birthday: "",
    body_fat_pct: "",
    muscle_pct: "",
    subcutaneous_fat: "",
    visceral_fat: "",
    water_pct: "",
    protein_pct: "",
    bone_mass: "",
    bmr: "",
  });

  const computedAgeForDisplay = useMemo(() => {
    if (bodyForm.birthday) return dayjs().diff(dayjs(bodyForm.birthday), "year");
    return bodyMetrics?.age ?? null;
  }, [bodyForm.birthday, bodyMetrics?.age]);

  const computedBmiForDisplay = useMemo(() => {
    const height = Number(bodyForm.height_cm);
    const weight = Number(bodyForm.weight_kg);
    if (Number.isFinite(height) && Number.isFinite(weight) && height > 0 && weight > 0) {
      return Number((weight / Math.pow(height / 100, 2)).toFixed(1));
    }
    return bodyMetrics?.bmi ?? null;
  }, [bodyForm.height_cm, bodyForm.weight_kg, bodyMetrics?.bmi]);

  async function loadAvatar(userId: string) {
    const path = `${userId}/avatar.png`;
    const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) {
      setAvatarUrl(null);
      return;
    }
    setAvatarUrl(data.signedUrl);
  }

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, base_currency, username, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;
      if (error || !data) {
        setNotice("加载个人信息失败");
        setLoading(false);
        return;
      }

      const row = data as ProfileRow;
      setProfile(row);
      setBasicForm({
        display_name: row.display_name ?? "",
        username: row.username ?? "",
        base_currency: row.base_currency ?? "CNY",
        phone: row.phone ?? "",
      });
      await loadAvatar(user.id);
      setLoading(false);
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const loadBodyMetrics = useCallback(async () => {
    if (!user) return;
    setBodyLoading(true);

    const { data, error } = await supabase
      .from("body_metrics")
      .select(
        "user_id,height_cm,weight_kg,gender,birthday,age,body_fat_pct,muscle_pct,subcutaneous_fat,visceral_fat,bmi,water_pct,protein_pct,bone_mass,bmr"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      setNotice("加载身体信息失败");
      setBodyMetrics(null);
      setBodyLoading(false);
      return;
    }

    const row = (data ?? null) as BodyMetricsRow | null;
    setBodyMetrics(row);
    setBodyForm({
      height_cm: row?.height_cm?.toString() ?? "",
      weight_kg: row?.weight_kg?.toString() ?? "",
      gender: row?.gender ?? "",
      birthday: row?.birthday ?? "",
      body_fat_pct: row?.body_fat_pct?.toString() ?? "",
      muscle_pct: row?.muscle_pct?.toString() ?? "",
      subcutaneous_fat: row?.subcutaneous_fat?.toString() ?? "",
      visceral_fat: row?.visceral_fat?.toString() ?? "",
      water_pct: row?.water_pct?.toString() ?? "",
      protein_pct: row?.protein_pct?.toString() ?? "",
      bone_mass: row?.bone_mass?.toString() ?? "",
      bmr: row?.bmr?.toString() ?? "",
    });
    setBodyLoading(false);
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncFromHash = () => {
      const nextTab = window.location.hash === "#body" ? "body" : "basic";
      setActiveTab(nextTab);
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => {
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "body" && !bodyMetrics) {
      void loadBodyMetrics();
    }
  }, [activeTab, bodyMetrics, loadBodyMetrics]);

  const handleSaveBasic = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: basicForm.display_name.trim() || null,
        username: basicForm.username.trim() || null,
        base_currency: basicForm.base_currency.trim() || "CNY",
        phone: basicForm.phone.trim() || null,
      })
      .eq("id", user.id);

    setLoading(false);
    if (error) {
      setNotice("保存失败");
      return;
    }
    setNotice("保存成功");
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setNotice(`头像大小不能超过 ${MAX_AVATAR_SIZE_MB}MB`);
      return;
    }

    setUploading(true);
    const path = `${user.id}/avatar.png`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type,
    });

    setUploading(false);
    if (error) {
      setNotice("上传失败");
      return;
    }
    await loadAvatar(user.id);
    setNotice("头像已更新");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(REMEMBER_ME_KEY);
      window.localStorage.removeItem(SESSION_STARTED_AT_KEY);
    }
    setNotice("已退出登录");
  };

  const handleSaveBody = async () => {
    if (!user) return;
    setBodySaving(true);

    const birthday = bodyForm.birthday ? dayjs(bodyForm.birthday) : null;
    const computedAge = birthday ? dayjs().diff(birthday, "year") : null;
    const height = toNumberOrNull(bodyForm.height_cm);
    const weight = toNumberOrNull(bodyForm.weight_kg);
    const computedBmi =
      height && weight && height > 0 && weight > 0
        ? Number((weight / Math.pow(height / 100, 2)).toFixed(1))
        : null;

    const payload = {
      user_id: user.id,
      height_cm: height,
      weight_kg: weight,
      gender: bodyForm.gender || null,
      birthday: birthday ? birthday.format("YYYY-MM-DD") : null,
      age: computedAge,
      body_fat_pct: toNumberOrNull(bodyForm.body_fat_pct),
      muscle_pct: toNumberOrNull(bodyForm.muscle_pct),
      subcutaneous_fat: toNumberOrNull(bodyForm.subcutaneous_fat),
      visceral_fat: toNumberOrNull(bodyForm.visceral_fat),
      bmi: computedBmi,
      water_pct: toNumberOrNull(bodyForm.water_pct),
      protein_pct: toNumberOrNull(bodyForm.protein_pct),
      bone_mass: toNumberOrNull(bodyForm.bone_mass),
      bmr: toNumberOrNull(bodyForm.bmr),
    };

    const { error } = await supabase.from("body_metrics").upsert(payload).select("*").single();

    setBodySaving(false);
    if (error) {
      setNotice("保存失败");
      return;
    }

    setNotice("保存成功");
    await loadBodyMetrics();
  };

  return (
    <div className="app-page">
      <PageHeader title="个人中心" subtitle="管理账户信息与身体指标" />

      {notice ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">{notice}</div>
      ) : null}

      <section className="rounded-2xl border-2 border-line bg-panel p-4 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-3">
            <button
              aria-label="返回首页"
              type="button"
              onClick={() => router.push("/")}
              className="rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink"
            >
              ←
            </button>
            <h3 className="text-lg font-semibold text-ink">资料设置</h3>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("basic")}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                activeTab === "basic" ? "bg-primary text-white" : "border border-line text-ink"
              }`}
            >
              基本信息
            </button>
            <button
              type="button"
              onClick={async () => {
                setActiveTab("body");
                if (!bodyMetrics) await loadBodyMetrics();
              }}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                activeTab === "body" ? "bg-primary text-white" : "border border-line text-ink"
              }`}
            >
              身体信息
            </button>
          </div>
        </div>

        {activeTab === "basic" ? (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[120px_1fr] sm:items-start">
              <label className="relative block h-24 w-24 cursor-pointer overflow-hidden rounded-full border border-line bg-white">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="头像" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xl font-semibold text-muted">
                    {profile?.username?.slice(0, 1) || "U"}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleAvatarUpload(file);
                    event.currentTarget.value = "";
                  }}
                />
                <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1 text-center text-xs text-white">
                  {uploading ? "上传中..." : "更换头像"}
                </span>
              </label>

              <div className="grid gap-2 rounded-xl border border-line bg-white/70 p-3 text-sm text-muted sm:grid-cols-2">
                <p>邮箱：{user?.email || "-"}</p>
                <p>手机号：{profile?.phone || "-"}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-muted">
                昵称
                <input
                  value={basicForm.display_name}
                  onChange={(event) => setBasicForm((prev) => ({ ...prev, display_name: event.target.value }))}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                />
              </label>
              <label className="grid gap-1 text-sm text-muted">
                用户名
                <input
                  value={basicForm.username}
                  onChange={(event) => setBasicForm((prev) => ({ ...prev, username: event.target.value }))}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                />
              </label>
              <label className="grid gap-1 text-sm text-muted">
                手机号
                <input
                  value={basicForm.phone}
                  onChange={(event) => setBasicForm((prev) => ({ ...prev, phone: event.target.value }))}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                />
              </label>
              <label className="grid gap-1 text-sm text-muted">
                默认币种
                <select
                  value={basicForm.base_currency}
                  onChange={(event) => setBasicForm((prev) => ({ ...prev, base_currency: event.target.value }))}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveBasic}
                disabled={loading || uploading}
                className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                保存
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink"
              >
                退出登录
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {bodyLoading ? <p className="text-sm text-muted">加载中...</p> : null}

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["身高 (cm)", "height_cm"],
                ["体重 (kg)", "weight_kg"],
                ["体脂率 (%)", "body_fat_pct"],
                ["肌肉率 (%)", "muscle_pct"],
                ["皮下脂肪", "subcutaneous_fat"],
                ["内脏脂肪", "visceral_fat"],
                ["水分 (%)", "water_pct"],
                ["蛋白质 (%)", "protein_pct"],
                ["骨量", "bone_mass"],
                ["基础代谢 (BMR)", "bmr"],
              ].map(([label, key]) => (
                <label key={key} className="grid gap-1 text-sm text-muted">
                  {label}
                  <input
                    type="number"
                    step="0.1"
                    value={bodyForm[key as keyof BodyForm]}
                    onChange={(event) =>
                      setBodyForm((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                    className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                  />
                </label>
              ))}

              <label className="grid gap-1 text-sm text-muted">
                性别
                <select
                  value={bodyForm.gender}
                  onChange={(event) => setBodyForm((prev) => ({ ...prev, gender: event.target.value }))}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                >
                  <option value="">未设置</option>
                  <option value="male">男</option>
                  <option value="female">女</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm text-muted">
                生日
                <input
                  type="date"
                  value={bodyForm.birthday}
                  onChange={(event) => setBodyForm((prev) => ({ ...prev, birthday: event.target.value }))}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                />
              </label>
            </div>

            <div className="grid gap-1 rounded-xl border border-line bg-white/80 p-3 text-sm text-muted sm:grid-cols-2">
              <p>BMI（自动计算）：{computedBmiForDisplay ?? "-"}</p>
              <p>年龄（自动计算）：{computedAgeForDisplay ?? "-"}</p>
            </div>

            <div>
              <button
                type="button"
                onClick={handleSaveBody}
                disabled={bodySaving}
                className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {bodySaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        )}
      </section>

      <AboutAndPreferencesPanel onNotice={setNotice} />
    </div>
  );
}
