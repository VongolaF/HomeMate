"use client";

import { QuestionCircleOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Input,
  Popover,
  Row,
  Select,
  Space,
  Spin,
  Tooltip,
  Typography,
  message,
  theme,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MealWeekTable, { type MealDayPlan, type MealSlot } from "@/components/health/MealWeekTable";
import WorkoutWeekTable, { type WorkoutDayPlan, type WorkoutSlot } from "@/components/health/WorkoutWeekTable";
import { supabase } from "@/lib/supabase/client";
import {
  DEFAULT_HEALTH_GOAL,
  HEALTH_GOAL_OPTIONS,
  normalizeHealthGoal,
  type HealthGoal,
} from "@/lib/health/goals";

type SelectedContext =
  | {
      date: string;
      weekStart: string;
      view: "meals" | "workouts";
      selectionType: "day" | "slot";
      slotType?: MealSlot | WorkoutSlot;
    }
  | null;

type MealDayPlanApi = {
  date: string;
  breakfast?: string | null;
  lunch?: string | null;
  dinner?: string | null;
  snacks?: string | null;
  breakfast_recipe?: MealRecipe | null;
  lunch_recipe?: MealRecipe | null;
  dinner_recipe?: MealRecipe | null;
  snacks_recipe?: MealRecipe | null;
};

type MealRecipe = {
  name?: string | null;
  ingredients?: string[] | null;
  steps?: string[] | null;
  tips?: string | null;
};

type WorkoutDayPlanApi = {
  date: string;
  cardio?: string | null;
  strength?: string | null;
  duration_min?: number | null;
  notes?: string | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "loading" | "error";
};

type HealthPlanResponse<T> = {
  weekPlan: Record<string, unknown> | null;
  dayPlans: T[];
};

const weekdayLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const mealSlotLabels: Record<MealSlot, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snacks: "加餐",
};

const makeChatMessageId = () => {
  if (typeof globalThis !== "undefined") {
    const cryptoAny = globalThis.crypto as unknown as { randomUUID?: () => string } | undefined;
    if (cryptoAny?.randomUUID) return cryptoAny.randomUUID();
  }
  return `msg_${Math.random().toString(16).slice(2)}_${Date.now()}`;
};

const buildWeekStartMonday = () => {
  const today = dayjs();
  const dayIndex = today.day();
  const diff = (dayIndex + 6) % 7;
  return today.subtract(diff, "day").format("YYYY-MM-DD");
};

const buildWeekDays = (weekStart: string) => {
  const startOfWeek = dayjs(weekStart);
  return Array.from({ length: 7 }, (_, index) => startOfWeek.add(index, "day"));
};

const createMealData = (days: dayjs.Dayjs[], dayPlans: MealDayPlanApi[]): MealDayPlan[] => {
  const planMap = dayPlans.reduce<Record<string, MealDayPlanApi>>((acc, plan) => {
    acc[plan.date] = plan;
    return acc;
  }, {});

  return days.map((day, index) => {
    const date = day.format("YYYY-MM-DD");
    const plan = planMap[date];
    return {
      date,
      weekdayLabel: weekdayLabels[index],
      breakfast: plan?.breakfast ?? null,
      lunch: plan?.lunch ?? null,
      dinner: plan?.dinner ?? null,
      snacks: plan?.snacks ?? null,
    };
  });
};

const createWorkoutData = (days: dayjs.Dayjs[], dayPlans: WorkoutDayPlanApi[]): WorkoutDayPlan[] => {
  const planMap = dayPlans.reduce<Record<string, WorkoutDayPlanApi>>((acc, plan) => {
    acc[plan.date] = plan;
    return acc;
  }, {});

  return days.map((day, index) => {
    const date = day.format("YYYY-MM-DD");
    const plan = planMap[date];
    return {
      date,
      weekdayLabel: weekdayLabels[index],
      cardio: plan?.cardio ?? null,
      strength: plan?.strength ?? null,
      duration_min: plan?.duration_min ?? null,
      notes: plan?.notes ?? null,
    };
  });
};

const parseJson = async <T,>(response: Response): Promise<T | null> => {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

const buildHistoryPayload = (history: ChatMessage[]) =>
  history
    .filter((item) => item.status !== "loading" && item.status !== "error")
    .map((item) => ({ role: item.role, content: item.content.trim() }))
    .filter((item) => item.content.length > 0)
    .slice(-12);

export default function HealthPage() {
  const { token } = theme.useToken();
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState<"meals" | "workouts">("meals");
  const [selectedContext, setSelectedContext] = useState<SelectedContext>(null);
  const [healthGoal, setHealthGoal] = useState<HealthGoal>(DEFAULT_HEALTH_GOAL);
  const [mealDayPlans, setMealDayPlans] = useState<MealDayPlanApi[]>([]);
  const [workoutDayPlans, setWorkoutDayPlans] = useState<WorkoutDayPlanApi[]>([]);
  const [prevMealDayPlans, setPrevMealDayPlans] = useState<MealDayPlanApi[]>([]);
  const [prevWorkoutDayPlans, setPrevWorkoutDayPlans] = useState<WorkoutDayPlanApi[]>([]);
  const [mealChatInput, setMealChatInput] = useState("");
  const [workoutChatInput, setWorkoutChatInput] = useState("");
  const [mealChatHistory, setMealChatHistory] = useState<ChatMessage[]>([]);
  const [workoutChatHistory, setWorkoutChatHistory] = useState<ChatMessage[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isSendingMeal, setIsSendingMeal] = useState(false);
  const [isSendingWorkout, setIsSendingWorkout] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [authExpired, setAuthExpired] = useState(false);

  const mealChatScrollRef = useRef<HTMLDivElement | null>(null);
  const workoutChatScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback((container: HTMLDivElement | null) => {
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottom(mealChatScrollRef.current);
  }, [mealChatHistory.length, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(workoutChatScrollRef.current);
  }, [workoutChatHistory.length, scrollToBottom]);

  useEffect(() => {
    if (!isChatOpen) return;
    if (activeTab === "meals") scrollToBottom(mealChatScrollRef.current);
    else scrollToBottom(workoutChatScrollRef.current);
  }, [activeTab, isChatOpen, scrollToBottom]);

  useEffect(() => {
    if (!authExpired) return;
    messageApi.warning("登录已过期，请重新登录");
    router.push("/login");
    setAuthExpired(false);
  }, [authExpired, messageApi, router]);

  const loadHealthGoal = useCallback(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("health_goal")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (error) return;

    const normalized = normalizeHealthGoal((data as { health_goal?: unknown } | null)?.health_goal);
    if (normalized) setHealthGoal(normalized);
  }, []);

  const persistHealthGoal = useCallback(
    async (nextGoal: HealthGoal) => {
      setHealthGoal(nextGoal);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ health_goal: nextGoal })
        .eq("id", userData.user.id);

      if (error) {
        messageApi.error("保存目标失败，请稍后再试");
      }
    },
    [messageApi]
  );

  const renderChatHistory = useCallback(
    (history: ChatMessage[]) => {
      if (!history.length) {
        return (
          <Typography.Text type="secondary" style={{ display: "block" }}>
            暂无对话
          </Typography.Text>
        );
      }

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {history.map((item, index) => {
            const isUser = item.role === "user";
            const bubbleBackground = isUser ? token.colorPrimaryBg : token.colorBgContainer;
            const bubbleBorderColor = token.colorBorderSecondary;
            const avatarText = isUser ? "我" : "AI";
            const bubbleRadius = isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px";
            const isLoading = item.role === "assistant" && item.status === "loading";
            const isError = item.role === "assistant" && item.status === "error";

            return (
              <div
                key={item.id || `${item.role}-${index}`}
                style={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: isUser ? "row-reverse" : "row",
                    gap: 8,
                    alignItems: "flex-start",
                    maxWidth: "100%",
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1px solid ${bubbleBorderColor}`,
                      background: token.colorFillTertiary,
                      color: token.colorTextSecondary,
                      fontSize: 12,
                      flex: "0 0 auto",
                    }}
                  >
                    {avatarText}
                  </div>
                  <div
                    style={{
                      maxWidth: "78%",
                      border: `1px solid ${bubbleBorderColor}`,
                      borderRadius: bubbleRadius,
                      padding: "10px 12px",
                      background: bubbleBackground,
                    }}
                  >
                    {isLoading ? (
                      <Space size={8}>
                        <Spin size="small" />
                        <Typography.Text type="secondary">正在思考…</Typography.Text>
                      </Space>
                    ) : (
                      <Typography.Text
                        style={{ whiteSpace: "pre-wrap" }}
                        type={isError ? "danger" : undefined}
                      >
                        {item.content}
                      </Typography.Text>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    },
    [token.colorBgContainer, token.colorBorderSecondary, token.colorFillTertiary, token.colorPrimaryBg, token.colorTextSecondary]
  );

  const weekStart = useMemo(() => buildWeekStartMonday(), []);
  const prevWeekStart = useMemo(
    () => dayjs(weekStart).subtract(7, "day").format("YYYY-MM-DD"),
    [weekStart]
  );
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);
  const prevWeekDays = useMemo(() => buildWeekDays(prevWeekStart), [prevWeekStart]);
  const todayIso = useMemo(() => dayjs().format("YYYY-MM-DD"), []);

  const mealData = useMemo(() => createMealData(weekDays, mealDayPlans), [mealDayPlans, weekDays]);
  const workoutData = useMemo(
    () => createWorkoutData(weekDays, workoutDayPlans),
    [weekDays, workoutDayPlans]
  );

  const prevMealData = useMemo(
    () => createMealData(prevWeekDays, prevMealDayPlans),
    [prevMealDayPlans, prevWeekDays]
  );
  const prevWorkoutData = useMemo(
    () => createWorkoutData(prevWeekDays, prevWorkoutDayPlans),
    [prevWeekDays, prevWorkoutDayPlans]
  );

  const getAccessToken = useCallback(async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      messageApi.error("Unable to read session.");
      return null;
    }

    const session = data.session;
    const expiresAt = typeof session?.expires_at === "number" ? session.expires_at : null;

    if (session?.access_token && expiresAt && expiresAt > nowSeconds + 60) {
      return session.access_token;
    }

    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      return session?.access_token ?? null;
    }
    return refreshed.session?.access_token ?? session?.access_token ?? null;
  }, [messageApi]);

  const fetchWithAuth = useCallback(
    async (url: string, init?: RequestInit) => {
      const token = await getAccessToken();
      if (!token) {
        setAuthExpired(true);
        return null;
      }

      const headers: HeadersInit = {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      };

      const response = await fetch(url, { ...init, headers });
      if (response.status !== 401) return response;

      const { data: refreshed } = await supabase.auth.refreshSession();
      const nextToken = refreshed.session?.access_token;
      if (!nextToken) {
        setAuthExpired(true);
        return response;
      }

      const retryHeaders: HeadersInit = {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${nextToken}`,
      };

      const retryResponse = await fetch(url, { ...init, headers: retryHeaders });
      if (retryResponse.status === 401) {
        setAuthExpired(true);
      }
      return retryResponse;
    },
    [getAccessToken, supabase]
  );

  const loadPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        messageApi.warning("Please login first.");
        return;
      }

      const query = new URLSearchParams({ weekStart }).toString();
      const prevQuery = new URLSearchParams({ weekStart: prevWeekStart }).toString();

      const [mealResponse, workoutResponse, prevMealResponse, prevWorkoutResponse] =
        await Promise.all([
          fetchWithAuth(`/api/health/meal?${query}`),
          fetchWithAuth(`/api/health/workout?${query}`),
          fetchWithAuth(`/api/health/meal?${prevQuery}`),
          fetchWithAuth(`/api/health/workout?${prevQuery}`),
        ]);

      if (!mealResponse || !workoutResponse || !prevMealResponse || !prevWorkoutResponse) {
        messageApi.warning("Please login first.");
        return;
      }

      if (!mealResponse.ok) {
        const payload = await parseJson<{ error?: string }>(mealResponse);
        throw new Error(payload?.error || "Failed to load meal plan");
      }

      if (!workoutResponse.ok) {
        const payload = await parseJson<{ error?: string }>(workoutResponse);
        throw new Error(payload?.error || "Failed to load workout plan");
      }

      if (!prevMealResponse.ok) {
        const payload = await parseJson<{ error?: string }>(prevMealResponse);
        throw new Error(payload?.error || "Failed to load previous meal plan");
      }

      if (!prevWorkoutResponse.ok) {
        const payload = await parseJson<{ error?: string }>(prevWorkoutResponse);
        throw new Error(payload?.error || "Failed to load previous workout plan");
      }

      const mealPayload = await parseJson<HealthPlanResponse<MealDayPlanApi>>(mealResponse);
      const workoutPayload = await parseJson<HealthPlanResponse<WorkoutDayPlanApi>>(workoutResponse);

      const prevMealPayload = await parseJson<HealthPlanResponse<MealDayPlanApi>>(prevMealResponse);
      const prevWorkoutPayload = await parseJson<HealthPlanResponse<WorkoutDayPlanApi>>(prevWorkoutResponse);

      setMealDayPlans(mealPayload?.dayPlans ?? []);
      setWorkoutDayPlans(workoutPayload?.dayPlans ?? []);
      setPrevMealDayPlans(prevMealPayload?.dayPlans ?? []);
      setPrevWorkoutDayPlans(prevWorkoutPayload?.dayPlans ?? []);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Failed to load plans");
    } finally {
      setIsLoadingPlans(false);
    }
  }, [fetchWithAuth, getAccessToken, messageApi, prevWeekStart, weekStart]);

  const sendChatMessage = useCallback(
    async (view: "meals" | "workouts") => {
      const isMeals = view === "meals";
      const inputValue = isMeals ? mealChatInput : workoutChatInput;
      const trimmed = inputValue.trim();

      if (!trimmed) {
        messageApi.warning("Please enter a message.");
        return;
      }

      const hasSelection = selectedContext?.view === view && Boolean(selectedContext?.date);
      const contextWeekStart = hasSelection ? selectedContext?.weekStart : weekStart;
      const messageForAgent = trimmed;
      const historyPayload = buildHistoryPayload(isMeals ? mealChatHistory : workoutChatHistory);

      const context = hasSelection
        ? {
            view,
            date: selectedContext?.date,
            slotType: selectedContext?.selectionType === "slot" ? selectedContext?.slotType : undefined,
          }
        : { view };

      const assistantPlaceholderId = makeChatMessageId();

      if (isMeals) {
        setMealChatHistory((prev) => [
          ...prev,
          { id: makeChatMessageId(), role: "user", content: trimmed },
          { id: assistantPlaceholderId, role: "assistant", content: "", status: "loading" },
        ]);
        setMealChatInput("");
        setIsSendingMeal(true);
      } else {
        setWorkoutChatHistory((prev) => [
          ...prev,
          { id: makeChatMessageId(), role: "user", content: trimmed },
          { id: assistantPlaceholderId, role: "assistant", content: "", status: "loading" },
        ]);
        setWorkoutChatInput("");
        setIsSendingWorkout(true);
      }

      const replaceAssistantPlaceholder = (next: { content: string; status?: ChatMessage["status"] }) => {
        if (isMeals) {
          setMealChatHistory((prev) =>
            prev.map((msg) =>
              msg.id === assistantPlaceholderId
                ? { ...msg, role: "assistant", content: next.content, status: next.status }
                : msg
            )
          );
        } else {
          setWorkoutChatHistory((prev) =>
            prev.map((msg) =>
              msg.id === assistantPlaceholderId
                ? { ...msg, role: "assistant", content: next.content, status: next.status }
                : msg
            )
          );
        }
      };

      try {
        const token = await getAccessToken();
        if (!token) {
          messageApi.warning("Please login first.");
          replaceAssistantPlaceholder({ content: "未登录或登录已过期，请重新登录后再试。", status: "error" });
          return;
        }

        const response = await fetchWithAuth("/api/health/agent-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: messageForAgent,
            weekStart: contextWeekStart,
            timezone,
            context,
            goal: healthGoal,
            history: historyPayload,
          }),
        });

        if (!response) {
          messageApi.warning("Please login first.");
          return;
        }

        if (!response.ok) {
          const payload = await parseJson<{ error?: string }>(response);
          throw new Error(payload?.error || "Agent request failed");
        }

        const payload = await parseJson<{ reply?: string }>(response);
        const reply = payload?.reply?.trim();
        if (!reply) throw new Error("Empty agent response");

        replaceAssistantPlaceholder({ content: reply });

        // The agent may have updated the plan via tools (update_*), so refresh the tables.
        void loadPlans();
      } catch (error) {
        const text = error instanceof Error ? error.message : "Agent request failed";
        messageApi.error(text);
        replaceAssistantPlaceholder({ content: text, status: "error" });
      } finally {
        if (isMeals) setIsSendingMeal(false);
        else setIsSendingWorkout(false);
      }
    },
    [
      fetchWithAuth,
      getAccessToken,
      loadPlans,
      healthGoal,
      mealChatInput,
      mealChatHistory,
      prevWeekStart,
      messageApi,
      selectedContext,
      timezone,
      weekStart,
      workoutChatInput,
      workoutChatHistory,
    ]
  );

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    void loadHealthGoal();
  }, [loadHealthGoal]);

  const updateSelection = useCallback(
    (
      view: "meals" | "workouts",
      weekStartForSelection: string,
      next: { date: string; selectionType: "day" | "slot"; slotType?: MealSlot | WorkoutSlot }
    ) => {
      setSelectedContext((prev) => {
        if (
          prev &&
          prev.view === view &&
          prev.weekStart === weekStartForSelection &&
          prev.date === next.date &&
          prev.selectionType === next.selectionType &&
          prev.slotType === next.slotType
        ) {
          return null;
        }
        return { view, weekStart: weekStartForSelection, ...next };
      });
    },
    []
  );

  const activeHistory = activeTab === "meals" ? mealChatHistory : workoutChatHistory;
  const activeChatInput = activeTab === "meals" ? mealChatInput : workoutChatInput;
  const activeChatScrollRef = activeTab === "meals" ? mealChatScrollRef : workoutChatScrollRef;
  const isSendingActive = activeTab === "meals" ? isSendingMeal : isSendingWorkout;

  const selectedMealRecipe = useMemo(() => {
    if (activeTab !== "meals") return null;
    if (!selectedContext || selectedContext.view !== "meals") return null;
    if (selectedContext.selectionType !== "slot" || !selectedContext.slotType) return null;

    const sourcePlans =
      selectedContext.weekStart === weekStart
        ? mealDayPlans
        : selectedContext.weekStart === prevWeekStart
          ? prevMealDayPlans
          : [];

    const dayPlan = sourcePlans.find((plan) => plan.date === selectedContext.date);
    if (!dayPlan) return null;

    const slot = selectedContext.slotType as MealSlot;
    const recipe =
      slot === "breakfast"
        ? dayPlan.breakfast_recipe
        : slot === "lunch"
          ? dayPlan.lunch_recipe
          : slot === "dinner"
            ? dayPlan.dinner_recipe
            : dayPlan.snacks_recipe;

    const mealText =
      slot === "breakfast"
        ? dayPlan.breakfast
        : slot === "lunch"
          ? dayPlan.lunch
          : slot === "dinner"
            ? dayPlan.dinner
            : dayPlan.snacks;

    return {
      date: selectedContext.date,
      slot,
      label: mealSlotLabels[slot],
      recipe,
      mealText: mealText ?? null,
    };
  }, [activeTab, mealDayPlans, prevMealDayPlans, prevWeekStart, selectedContext, weekStart]);

  const selectedLabel = useMemo(() => {
    if (!selectedContext || selectedContext.view !== activeTab) {
      return "可先点击计划中的某一天（或某一项）作为上下文，再开始提问。";
    }
    const base = `${selectedContext.weekStart} 周 / ${selectedContext.date}`;
    if (selectedContext.selectionType === "day") return `已选中：${base}`;
    return `已选中：${base} / ${String(selectedContext.slotType ?? "")}`;
  }, [activeTab, selectedContext]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {contextHolder}
      <Typography.Title level={3} style={{ margin: 0 }}>
        健康计划
      </Typography.Title>
      <Card
        styles={{
          header: {
            background: token.colorFillAlter,
            border: `1px solid ${token.colorBorder}`,
            borderBottom: `1px solid ${token.colorBorder}`,
            borderTopLeftRadius: token.borderRadiusLG,
            borderTopRightRadius: token.borderRadiusLG,
          },
          body: {
            paddingTop: 16,
          },
        }}
        style={{ borderRadius: token.borderRadiusLG }}
        tabList={[
          {
            key: "meals",
            tab: (
              <Space size={8}>
                <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>
                  🍽️
                </span>
                <span style={{ fontWeight: activeTab === "meals" ? 700 : 500 }}>一周三餐</span>
              </Space>
            ),
          },
          {
            key: "workouts",
            tab: (
              <Space size={8}>
                <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>
                  🏋️
                </span>
                <span style={{ fontWeight: activeTab === "workouts" ? 700 : 500 }}>一周健身计划</span>
              </Space>
            ),
          },
        ]}
        activeTabKey={activeTab}
        onTabChange={(key) => setActiveTab(key as "meals" | "workouts")}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <Space size={12} wrap align="start">
            <Space size={6}>
              <Typography.Text type="secondary">近期目标</Typography.Text>
              <Select
                value={healthGoal}
                style={{ minWidth: 160 }}
                optionLabelProp="plainLabel"
                options={HEALTH_GOAL_OPTIONS.map((opt) => ({
                  value: opt.value,
                  plainLabel: opt.label,
                  label: (
                    <Space size={6}>
                      <span>{opt.label}</span>
                      <Tooltip title={opt.hint} placement="right">
                        <QuestionCircleOutlined style={{ color: token.colorTextSecondary }} />
                      </Tooltip>
                    </Space>
                  ),
                }))}
                onChange={(value) => {
                  const normalized = normalizeHealthGoal(value) ?? DEFAULT_HEALTH_GOAL;
                  void persistHealthGoal(normalized);
                }}
              />
            </Space>

            <Link href="/profile#body" prefetch={false}>
              <Button type="link">修改身体信息</Button>
            </Link>
          </Space>

          <Popover
            placement="bottomRight"
            trigger="click"
            open={isChatOpen}
            onOpenChange={(open) => setIsChatOpen(open)}
            destroyOnHidden
            content={
              <div style={{ width: 420, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <Typography.Text strong>
                    {activeTab === "meals" ? "健康助理" : "训练助理"}
                  </Typography.Text>
                  <Button size="small" onClick={() => setIsChatOpen(false)}>
                    收起
                  </Button>
                </div>

                <Typography.Text type="secondary">{selectedLabel}</Typography.Text>

                <div
                  ref={activeChatScrollRef}
                  style={{
                    height: 360,
                    overflowY: "auto",
                    padding: 12,
                    borderRadius: 12,
                    background: token.colorBgLayout,
                    border: `1px solid ${token.colorBorderSecondary}`,
                  }}
                >
                  {renderChatHistory(activeHistory)}
                </div>

                <Input.TextArea
                  rows={3}
                  placeholder={
                    activeTab === "meals"
                      ? "例如：今天午餐吃什么更合适？"
                      : "例如：这天的训练强度是否合适？如何调整？"
                  }
                  value={activeChatInput}
                  onChange={(event) =>
                    activeTab === "meals"
                      ? setMealChatInput(event.target.value)
                      : setWorkoutChatInput(event.target.value)
                  }
                />

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <Button
                    onClick={() => {
                      if (activeTab === "meals") {
                        setMealChatHistory([]);
                        setPendingMealQuestion(null);
                      } else {
                        setWorkoutChatHistory([]);
                        setPendingWorkoutQuestion(null);
                      }
                    }}
                  >
                    清空聊天记录
                  </Button>
                  <Button
                    type="primary"
                    loading={isSendingActive}
                    onClick={() => sendChatMessage(activeTab)}
                  >
                    发送
                  </Button>
                </div>
              </div>
            }
          >
            <Tooltip
              placement="left"
              title={
                "AI 可以：生成/优化一周三餐与健身计划；基于你选中的日期/餐次/训练给建议；按你的要求修改计划；也能给单餐吃什么建议（不写入计划）。"
              }
            >
              <Button type="primary">打开 AI 对话</Button>
            </Tooltip>
          </Popover>
        </div>

        {activeTab === "meals" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Row gutter={[16, 16]} align="top">
              <Col xs={24} lg={12} style={{ display: "flex" }}>
                <Card
                  title="上周饮食计划"
                  loading={isLoadingPlans}
                  styles={{ body: { paddingTop: 12 } }}
                  style={{ width: "100%" }}
                >
                  <MealWeekTable
                    data={prevMealData}
                    selected={
                      selectedContext?.view === "meals" && selectedContext.weekStart === prevWeekStart
                        ? {
                            date: selectedContext.date,
                            selectionType: selectedContext.selectionType,
                            slotType:
                              selectedContext.selectionType === "slot"
                                ? (selectedContext.slotType as MealSlot)
                                : undefined,
                          }
                        : null
                    }
                    onSelect={(selection) => updateSelection("meals", prevWeekStart, selection)}
                  />
                </Card>
              </Col>
              <Col xs={24} lg={12} style={{ display: "flex" }}>
                <Card
                  title="本周饮食计划"
                  loading={isLoadingPlans}
                  styles={{ body: { paddingTop: 12 } }}
                  style={{ width: "100%" }}
                >
                  <MealWeekTable
                    data={mealData}
                    highlightDate={todayIso}
                    selected={
                      selectedContext?.view === "meals" && selectedContext.weekStart === weekStart
                        ? {
                            date: selectedContext.date,
                            selectionType: selectedContext.selectionType,
                            slotType:
                              selectedContext.selectionType === "slot"
                                ? (selectedContext.slotType as MealSlot)
                                : undefined,
                          }
                        : null
                    }
                    onSelect={(selection) => updateSelection("meals", weekStart, selection)}
                  />
                </Card>
              </Col>
            </Row>

          </div>
        ) : (
          <Row gutter={[16, 16]} align="top">
            <Col xs={24} lg={12} style={{ display: "flex" }}>
              <Card
                title="上周健身计划"
                loading={isLoadingPlans}
                styles={{ body: { paddingTop: 12 } }}
                style={{ width: "100%" }}
              >
                <WorkoutWeekTable
                  data={prevWorkoutData}
                  selected={
                    selectedContext?.view === "workouts" &&
                    selectedContext.weekStart === prevWeekStart
                      ? {
                          date: selectedContext.date,
                          selectionType: selectedContext.selectionType,
                          slotType:
                            selectedContext.selectionType === "slot"
                              ? (selectedContext.slotType as WorkoutSlot)
                              : undefined,
                        }
                      : null
                  }
                  onSelect={(selection) => updateSelection("workouts", prevWeekStart, selection)}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12} style={{ display: "flex" }}>
              <Card
                title="本周健身计划"
                loading={isLoadingPlans}
                styles={{ body: { paddingTop: 12 } }}
                style={{ width: "100%" }}
              >
                <WorkoutWeekTable
                  data={workoutData}
                  highlightDate={todayIso}
                  selected={
                    selectedContext?.view === "workouts" &&
                    selectedContext.weekStart === weekStart
                      ? {
                          date: selectedContext.date,
                          selectionType: selectedContext.selectionType,
                          slotType:
                            selectedContext.selectionType === "slot"
                              ? (selectedContext.slotType as WorkoutSlot)
                              : undefined,
                        }
                      : null
                  }
                  onSelect={(selection) => updateSelection("workouts", weekStart, selection)}
                />
              </Card>
            </Col>
          </Row>
        )}
      </Card>

      {selectedMealRecipe ? (
        <Card
          size="small"
          title={`${selectedMealRecipe.date} · ${selectedMealRecipe.label}食谱`}
          extra={
            <Button size="small" onClick={() => setSelectedContext(null)}>
              收起
            </Button>
          }
          style={{ width: "100%" }}
        >
          {selectedMealRecipe.recipe ? (
            <Space orientation="vertical" size={12} style={{ width: "100%" }}>
              <Typography.Text strong>
                {selectedMealRecipe.recipe.name || selectedMealRecipe.mealText || "未命名"}
              </Typography.Text>

              <div>
                <Typography.Text type="secondary">食材</Typography.Text>
                <ul style={{ margin: "6px 0 0 16px" }}>
                  {(selectedMealRecipe.recipe.ingredients ?? []).length ? (
                    (selectedMealRecipe.recipe.ingredients ?? []).map((item, idx) => (
                      <li key={`${item}-${idx}`}>{item}</li>
                    ))
                  ) : (
                    <li>暂无食材信息</li>
                  )}
                </ul>
              </div>

              <div>
                <Typography.Text type="secondary">步骤</Typography.Text>
                <ol style={{ margin: "6px 0 0 16px" }}>
                  {(selectedMealRecipe.recipe.steps ?? []).length ? (
                    (selectedMealRecipe.recipe.steps ?? []).map((step, idx) => (
                      <li key={`${step}-${idx}`}>{step}</li>
                    ))
                  ) : (
                    <li>暂无制作步骤</li>
                  )}
                </ol>
              </div>

              {selectedMealRecipe.recipe.tips ? (
                <div>
                  <Typography.Text type="secondary">小贴士</Typography.Text>
                  <Typography.Paragraph style={{ margin: "6px 0 0" }}>
                    {selectedMealRecipe.recipe.tips}
                  </Typography.Paragraph>
                </div>
              ) : null}
            </Space>
          ) : (
            <Typography.Text type="secondary">该餐暂无食谱，建议重新生成。</Typography.Text>
          )}
        </Card>
      ) : null}
    </div>
  );
}
