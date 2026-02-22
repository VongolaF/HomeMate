"use client";

import { useEffect, useState } from "react";
import { ArrowLeftOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
  Upload,
  theme,
  message,
} from "antd";
import ImgCrop from "antd-img-crop";
import { useRouter } from "next/navigation";
import dayjs, { type Dayjs } from "dayjs";
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

type BodyFormValues = {
  height_cm?: number;
  weight_kg?: number;
  gender?: string;
  birthday?: Dayjs;
  body_fat_pct?: number;
  muscle_pct?: number;
  subcutaneous_fat?: number;
  visceral_fat?: number;
  water_pct?: number;
  protein_pct?: number;
  bone_mass?: number;
  bmr?: number;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { token } = theme.useToken();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("basic");
  const [bodyLoading, setBodyLoading] = useState(false);
  const [bodySaving, setBodySaving] = useState(false);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricsRow | null>(null);
  const [form] = Form.useForm();
  const [bodyForm] = Form.useForm<BodyFormValues>();
  const watchedBirthday = Form.useWatch("birthday", bodyForm);
  const watchedHeightCm = Form.useWatch("height_cm", bodyForm);
  const watchedWeightKg = Form.useWatch("weight_kg", bodyForm);

  const computedAgeForDisplay = watchedBirthday
    ? dayjs().diff(watchedBirthday, "year")
    : bodyMetrics?.age ?? null;

  const computedBmiForDisplay =
    typeof watchedHeightCm === "number" &&
    typeof watchedWeightKg === "number" &&
    watchedHeightCm > 0 &&
    watchedWeightKg > 0
      ? Number((watchedWeightKg / Math.pow(watchedHeightCm / 100, 2)).toFixed(1))
      : bodyMetrics?.bmi ?? null;

  const lightTooltipProps = {
    color: token.colorFillTertiary,
    overlayInnerStyle: {
      color: token.colorText,
    },
  };

  const infoIconStyle = {
    fontSize: 12,
    color: token.colorTextTertiary,
  } as const;

  const MAX_AVATAR_SIZE_MB = 5;
  const MAX_AVATAR_SIZE_BYTES = MAX_AVATAR_SIZE_MB * 1024 * 1024;

  async function loadAvatar(userId: string) {
    const path = `${userId}/avatar.png`;
    const { data, error } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60);
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
        message.error("加载个人信息失败");
        setLoading(false);
        return;
      }

      setProfile(data as ProfileRow);
      form.setFieldsValue({
        display_name: data.display_name ?? "",
        base_currency: data.base_currency ?? "CNY",
        phone: data.phone ?? "",
      });
      await loadAvatar(user.id);
      setLoading(false);
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [user, form]);

  const handleSave = async (values: {
    display_name?: string;
    base_currency?: string;
    phone?: string;
  }) => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: values.display_name?.trim() || null,
        base_currency: values.base_currency?.trim() || "CNY",
        phone: values.phone?.trim() || null,
      })
      .eq("id", user.id);

    setLoading(false);
    if (error) {
      message.error("保存失败");
      return;
    }
    message.success("保存成功");
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return false;

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      message.error(`头像大小不能超过 ${MAX_AVATAR_SIZE_MB}MB`);
      return Upload.LIST_IGNORE;
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
      window.localStorage.removeItem(SESSION_STARTED_AT_KEY);
    }
    message.success("已退出登录");
  };

  const loadBodyMetrics = async () => {
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
      message.error("加载身体信息失败");
      setBodyMetrics(null);
      setBodyLoading(false);
      return;
    }

    const row = (data ?? null) as BodyMetricsRow | null;
    setBodyMetrics(row);
    bodyForm.setFieldsValue({
      height_cm: row?.height_cm ?? undefined,
      weight_kg: row?.weight_kg ?? undefined,
      gender: row?.gender ?? undefined,
      birthday: row?.birthday ? dayjs(row.birthday) : undefined,
      body_fat_pct: row?.body_fat_pct ?? undefined,
      muscle_pct: row?.muscle_pct ?? undefined,
      subcutaneous_fat: row?.subcutaneous_fat ?? undefined,
      visceral_fat: row?.visceral_fat ?? undefined,
      water_pct: row?.water_pct ?? undefined,
      protein_pct: row?.protein_pct ?? undefined,
      bone_mass: row?.bone_mass ?? undefined,
      bmr: row?.bmr ?? undefined,
    });
    setBodyLoading(false);
  };

  const handleSaveBody = async () => {
    if (!user) return;
    const values = await bodyForm.validateFields();
    setBodySaving(true);

    const computedAge = values.birthday ? dayjs().diff(values.birthday, "year") : null;
    const computedBmi =
      values.height_cm && values.weight_kg && values.height_cm > 0 && values.weight_kg > 0
        ? Number((values.weight_kg / Math.pow(values.height_cm / 100, 2)).toFixed(1))
        : null;

    const payload = {
      user_id: user.id,
      height_cm: values.height_cm ?? null,
      weight_kg: values.weight_kg ?? null,
      gender: values.gender ?? null,
      birthday: values.birthday ? values.birthday.format("YYYY-MM-DD") : null,
      age: computedAge,
      body_fat_pct: values.body_fat_pct ?? null,
      muscle_pct: values.muscle_pct ?? null,
      subcutaneous_fat: values.subcutaneous_fat ?? null,
      visceral_fat: values.visceral_fat ?? null,
      bmi: computedBmi,
      water_pct: values.water_pct ?? null,
      protein_pct: values.protein_pct ?? null,
      bone_mass: values.bone_mass ?? null,
      bmr: values.bmr ?? null,
    };

    const { error } = await supabase.from("body_metrics").upsert(payload).select("*").single();

    setBodySaving(false);
    if (error) {
      message.error("保存失败");
      return;
    }

    message.success("保存成功");
    await loadBodyMetrics();
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card
        title={
          <Space align="center" size={12}>
            <Button
              aria-label="返回首页"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/")}
            />
            <Typography.Text strong style={{ fontSize: 18 }}>
              个人中心
            </Typography.Text>
          </Space>
        }
        tabList={[
          { key: "basic", tab: "基本信息" },
          { key: "body", tab: "身体信息" },
        ]}
        activeTabKey={activeTab}
        onTabChange={async (key) => {
          setActiveTab(key);
          if (key === "body" && !bodyMetrics) {
            await loadBodyMetrics();
          }
        }}
      >
        <div style={{ display: activeTab === "basic" ? "grid" : "none", gap: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: 16,
                alignItems: "start",
              }}
            >
              <ImgCrop rotationSlider modalTitle="裁剪头像" modalOk="确定" modalCancel="取消">
                <Upload
                  showUploadList={false}
                  accept="image/*"
                  beforeUpload={handleAvatarUpload}
                >
                <div
                  style={{
                    position: "relative",
                    width: 96,
                    height: 96,
                    cursor: "pointer",
                  }}
                  className="profile-avatar"
                >
                  <Avatar
                    size={96}
                    src={avatarUrl || undefined}
                    style={{ width: 96, height: 96 }}
                  >
                    {profile?.username?.slice(0, 1) || "U"}
                  </Avatar>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 999,
                      background: "rgba(0, 0, 0, 0.35)",
                      opacity: 0,
                      transition: "opacity 160ms ease",
                    }}
                    className="profile-avatar-overlay"
                  >
                    <Button size="small" loading={uploading}>
                      更换头像
                    </Button>
                  </div>
                </div>
                </Upload>
              </ImgCrop>

              <Descriptions
                column={2}
                size="small"
                items={[
                  { key: "email", label: "邮箱", children: user?.email || "-" },
                  { key: "phone", label: "手机号", children: profile?.phone || "-" },
                ]}
              />
            </div>

            <Form form={form} layout="vertical" onFinish={handleSave}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 16,
                }}
              >
                <Form.Item
                  label="用户名"
                  name="display_name"
                  rules={[{ required: true, message: "请输入用户名" }]}
                >
                  <Input placeholder="例如：小明" />
                </Form.Item>
                <Form.Item
                  label="手机号"
                  name="phone"
                  rules={[
                    {
                      pattern: /^$|^[+\d][\d\s-]{5,20}$/,
                      message: "请输入有效手机号 (可包含 + / 空格 / - )",
                    },
                  ]}
                >
                  <Input placeholder="例如：+86 138-0000-0000" />
                </Form.Item>
                <Form.Item label="默认币种" name="base_currency">
                  <Select
                    options={[
                      { value: "CNY", label: "CNY" },
                      { value: "USD", label: "USD" },
                      { value: "EUR", label: "EUR" },
                      { value: "JPY", label: "JPY" },
                      { value: "HKD", label: "HKD" },
                      { value: "GBP", label: "GBP" },
                    ]}
                  />
                </Form.Item>
              </div>

              <Space>
                <Button type="primary" htmlType="submit" loading={loading || uploading}>
                  保存
                </Button>
                <Button onClick={handleLogout}>退出登录</Button>
              </Space>
            </Form>
          </div>

        <div style={{ display: activeTab === "body" ? "grid" : "none", gap: 16 }}>
          <Card title="身体信息" loading={bodyLoading}>
            <Form form={bodyForm} layout="vertical">
              <div style={{ maxWidth: 640, width: "100%", margin: "0 auto" }}>
                <Table
                  size="small"
                  bordered
                  pagination={false}
                  showHeader={false}
                  rowKey="key"
                  dataSource={[
                    {
                      key: "height_cm",
                      label: <Typography.Text>身高 (cm)</Typography.Text>,
                      input: (
                        <Form.Item name="height_cm" style={{ marginBottom: 0 }}>
                          <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
                        </Form.Item>
                      ),
                    },
                    {
                      key: "weight_kg",
                      label: <Typography.Text>体重 (kg)</Typography.Text>,
                      input: (
                        <Form.Item name="weight_kg" style={{ marginBottom: 0 }}>
                          <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
                        </Form.Item>
                      ),
                    },
                    {
                      key: "bmi",
                      label: <Typography.Text>BMI</Typography.Text>,
                      input: (
                        <Tooltip {...lightTooltipProps} title="BMI 根据身高和体重自动计算，无法手动修改">
                          <span style={{ display: "block" }}>
                            <InputNumber
                              disabled
                              min={0}
                              step={0.1}
                              placeholder="-"
                              value={computedBmiForDisplay ?? undefined}
                              style={{ width: "100%" }}
                            />
                          </span>
                        </Tooltip>
                      ),
                    },
                    {
                      key: "gender",
                      label: <Typography.Text>性别</Typography.Text>,
                      input: (
                        <Form.Item name="gender" style={{ marginBottom: 0 }}>
                          <Select
                            allowClear
                            options={[
                              { value: "male", label: "男" },
                              { value: "female", label: "女" },
                            ]}
                          />
                        </Form.Item>
                      ),
                    },
                    {
                      key: "birthday",
                      label: <Typography.Text>生日</Typography.Text>,
                      input: (
                        <Form.Item name="birthday" style={{ marginBottom: 0 }}>
                          <DatePicker style={{ width: "100%" }} />
                        </Form.Item>
                      ),
                    },
                    {
                      key: "age",
                      label: <Typography.Text>年龄</Typography.Text>,
                      input: (
                        <Tooltip {...lightTooltipProps} title="年龄根据生日自动计算，无法手动修改">
                          <span style={{ display: "block" }}>
                            <InputNumber
                              disabled
                              min={0}
                              max={130}
                              step={0.1}
                              placeholder="-"
                              value={computedAgeForDisplay ?? undefined}
                              style={{ width: "100%" }}
                            />
                          </span>
                        </Tooltip>
                      ),
                    },
                    {
                      key: "body_fat_pct",
                      label: (
                        <Space size={6}>
                          <Typography.Text>体脂率 (%)</Typography.Text>
                          <Tooltip
                            {...lightTooltipProps}
                            title="体脂率：体内脂肪重量占体重的比例 (通常来自体脂秤估算 )。"
                          >
                            <span>
                              <QuestionCircleOutlined aria-label="体脂率说明" style={infoIconStyle} />
                            </span>
                          </Tooltip>
                        </Space>
                      ),
                      input: (
                        <Form.Item name="body_fat_pct" style={{ marginBottom: 0 }}>
                          <InputNumber min={0} max={100} step={0.1} style={{ width: "100%" }} />
                        </Form.Item>
                      ),
                    },
                    {
                      key: "muscle_pct",
                      label: (
                        <Space size={6}>
                          <Typography.Text>肌肉率 (%)</Typography.Text>
                          <Tooltip
                            {...lightTooltipProps}
                            title="肌肉率：肌肉相关组织占体重的比例 (通常来自体脂秤估算 )。"
                          >
                            <span>
                              <QuestionCircleOutlined aria-label="肌肉率说明" style={infoIconStyle} />
                            </span>
                          </Tooltip>
                        </Space>
                      ),
                      input: (
                        <Form.Item name="muscle_pct" style={{ marginBottom: 0 }}>
                          <InputNumber min={0} max={100} step={0.1} style={{ width: "100%" }} />
                        </Form.Item>
                      ),
                    },
                    {
                      key: "subcutaneous_fat",
                      label: (
                        <Space size={6}>
                          <Typography.Text>皮下脂肪</Typography.Text>
                          <Tooltip
                            {...lightTooltipProps}
                            title="皮下脂肪：分布在皮肤下方的脂肪水平 (数值含义以测量设备为准 )。"
                          >
                            <span>
                              <QuestionCircleOutlined aria-label="皮下脂肪说明" style={infoIconStyle} />
                            </span>
                          </Tooltip>
                        </Space>
                      ),
                      input: (
                        <Form.Item name="subcutaneous_fat" style={{ marginBottom: 0 }}>
                          <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
                        </Form.Item>
                      ),
                    },
                    {
                      key: "visceral_fat",
                      label: (
                        <Space size={6}>
                          <Typography.Text>内脏脂肪</Typography.Text>
                          <Tooltip
                            {...lightTooltipProps}
                            title="内脏脂肪：围绕内脏器官的脂肪水平 (数值含义以测量设备为准 )。"
                          >
                            <span>
                              <QuestionCircleOutlined aria-label="内脏脂肪说明" style={infoIconStyle} />
                            </span>
                          </Tooltip>
                        </Space>
                      ),
                      input: (
                        <Form.Item name="visceral_fat" style={{ marginBottom: 0 }}>
                          <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
                        </Form.Item>
                      ),
                    },
                    {
                      key: "water_pct",
                      label: (
                        <Space size={6}>
                          <Typography.Text>水分 (%)</Typography.Text>
                          <Tooltip
                            {...lightTooltipProps}
                            title="水分：体内水分占体重的比例 (通常来自体脂秤估算 )。"
                          >
                            <span>
                              <QuestionCircleOutlined aria-label="水分说明" style={infoIconStyle} />
                            </span>
                          </Tooltip>
                        </Space>
                      ),
                      input: (
                        <Form.Item name="water_pct" style={{ marginBottom: 0 }}>
                          <InputNumber min={0} max={100} step={0.1} style={{ width: "100%" }} />
                        </Form.Item>
                      ),
                    },
                    {
                      key: "protein_pct",
                      label: (
                        <Space size={6}>
                          <Typography.Text>蛋白质 (%)</Typography.Text>
                          <Tooltip
                            {...lightTooltipProps}
                            title="蛋白质：体内蛋白质相关成分占体重的比例 (通常来自体脂秤估算 )。"
                          >
                            <span>
                              <QuestionCircleOutlined aria-label="蛋白质说明" style={infoIconStyle} />
                            </span>
                          </Tooltip>
                        </Space>
                      ),
                      input: (
                        <Form.Item name="protein_pct" style={{ marginBottom: 0 }}>
                          <InputNumber min={0} max={100} step={0.1} style={{ width: "100%" }} />
                        </Form.Item>
                      ),
                    },
                    {
                      key: "bone_mass",
                      label: (
                        <Space size={6}>
                          <Typography.Text>骨量</Typography.Text>
                          <Tooltip
                            {...lightTooltipProps}
                            title="骨量：骨矿物质相关的估算重量 (单位通常为 kg，含义以测量设备为准 )。"
                          >
                            <span>
                              <QuestionCircleOutlined aria-label="骨量说明" style={infoIconStyle} />
                            </span>
                          </Tooltip>
                        </Space>
                      ),
                      input: (
                        <Form.Item name="bone_mass" style={{ marginBottom: 0 }}>
                          <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
                        </Form.Item>
                      ),
                    },
                    {
                      key: "bmr",
                      label: (
                        <Space size={6}>
                          <Typography.Text>基础代谢 (BMR)</Typography.Text>
                          <Tooltip
                            {...lightTooltipProps}
                            title="基础代谢 (BMR)：静息状态下维持生命活动所需的最低能量消耗 (通常以 kcal/天 表示 )。"
                          >
                            <span>
                              <QuestionCircleOutlined aria-label="基础代谢说明" style={infoIconStyle} />
                            </span>
                          </Tooltip>
                        </Space>
                      ),
                      input: (
                        <Form.Item name="bmr" style={{ marginBottom: 0 }}>
                          <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
                        </Form.Item>
                      ),
                    },
                  ]}
                  columns={[
                    {
                      dataIndex: "label",
                      width: 180,
                      render: (value) => value,
                    },
                    {
                      dataIndex: "input",
                    },
                  ]}
                />
              </div>

              <div
                style={{
                  maxWidth: 640,
                  width: "100%",
                  margin: "12px auto 0",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Space>
                  <Button type="primary" onClick={handleSaveBody} loading={bodySaving}>
                    保存
                  </Button>
                </Space>
              </div>
            </Form>
          </Card>
        </div>
      </Card>
    </div>
  );
}
