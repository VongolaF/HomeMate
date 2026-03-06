"use client";

import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
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
  const router = useRouter();

  const [notice, setNotice] = useState<{ type: "error" | "warning" | "success"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"meals" | "workouts">("meals");
  const [selectedContext, setSelectedContext] = useState<SelectedContext>(null);
  const [healthGoal, setHealthGoal] = useState<HealthGoal>(DEFAULT_HEALTH_GOAL);
  const [mealDayPlans, setMealDayPlans] = useState<MealDayPlanApi[]>([]);
  const [workoutDayPlans, setWorkoutDayPlans] = useState<WorkoutDayPlanApi[]>([]);
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
  const chatTriggerRef = useRef<HTMLButtonElement | null>(null);
  const chatPopoverRef = useRef<HTMLDivElement | null>(null);

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
    if (!authExpired) return;
    setNotice({ type: "warning", text: "登录已过期，请重新登录" });
    router.push("/login");
    setAuthExpired(false);
  }, [authExpired, router]);

  useEffect(() => {
    if (!isChatOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = chatTriggerRef.current?.contains(target);
      const inPopover = chatPopoverRef.current?.contains(target);
      if (!inTrigger && !inPopover) {
        setIsChatOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsChatOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isChatOpen]);

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

  const persistHealthGoal = useCallback(async (nextGoal: HealthGoal) => {
    setHealthGoal(nextGoal);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ health_goal: nextGoal })
      .eq("id", userData.user.id);

    if (error) {
      setNotice({ type: "error", text: "保存目标失败，请稍后再试" });
    }
  }, []);

  const renderChatHistory = useCallback((history: ChatMessage[]) => {
    if (!history.length) {
      return <p className="text-sm text-muted">暂无对话</p>;
    }

    return (
      <div className="grid gap-3">
        {history.map((item, index) => {
          const isUser = item.role === "user";
          const isLoading = item.role === "assistant" && item.status === "loading";
          const isError = item.role === "assistant" && item.status === "error";

          return (
            <div
              key={item.id || `${item.role}-${index}`}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div className="flex max-w-[82%] items-start gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-full border border-line bg-slate-100 text-xs text-muted">
                  {isUser ? "我" : "AI"}
                </div>
                <div
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    isUser ? "border-sky-200 bg-sky-50" : "border-line bg-white"
                  } ${isError ? "text-rose-700" : "text-ink"}`}
                >
                  {isLoading ? "正在思考…" : <span className="whitespace-pre-wrap">{item.content}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }, []);

  const weekStart = useMemo(() => buildWeekStartMonday(), []);
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);
  const todayIso = useMemo(() => dayjs().format("YYYY-MM-DD"), []);

  const mealData = useMemo(() => createMealData(weekDays, mealDayPlans), [mealDayPlans, weekDays]);
  const workoutData = useMemo(() => createWorkoutData(weekDays, workoutDayPlans), [weekDays, workoutDayPlans]);

  const getAccessToken = useCallback(async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setNotice({ type: "error", text: "Unable to read session." });
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
  }, []);

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
    [getAccessToken]
  );

  const loadPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNotice({ type: "warning", text: "Please login first." });
        return;
      }

      const query = new URLSearchParams({ weekStart }).toString();

      const [mealResponse, workoutResponse] = await Promise.all([
        fetchWithAuth(`/api/health/meal?${query}`),
        fetchWithAuth(`/api/health/workout?${query}`),
      ]);

      if (!mealResponse || !workoutResponse) {
        setNotice({ type: "warning", text: "Please login first." });
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

      const mealPayload = await parseJson<HealthPlanResponse<MealDayPlanApi>>(mealResponse);
      const workoutPayload = await parseJson<HealthPlanResponse<WorkoutDayPlanApi>>(workoutResponse);

      setMealDayPlans(mealPayload?.dayPlans ?? []);
      setWorkoutDayPlans(workoutPayload?.dayPlans ?? []);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Failed to load plans" });
    } finally {
      setIsLoadingPlans(false);
    }
  }, [fetchWithAuth, getAccessToken, weekStart]);

  const sendChatMessage = useCallback(
    async (view: "meals" | "workouts") => {
      const isMeals = view === "meals";
      const inputValue = isMeals ? mealChatInput : workoutChatInput;
      const trimmed = inputValue.trim();

      if (!trimmed) {
        setNotice({ type: "warning", text: "Please enter a message." });
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
          setNotice({ type: "warning", text: "Please login first." });
          replaceAssistantPlaceholder({ content: "未登录或登录已过期，请重新登录后再试。", status: "error" });
          return;
        }

        const response = await fetchWithAuth("/api/health/agent-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
          setNotice({ type: "warning", text: "Please login first." });
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
        void loadPlans();
      } catch (error) {
        const text = error instanceof Error ? error.message : "Agent request failed";
        setNotice({ type: "error", text });
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

    const sourcePlans = selectedContext.weekStart === weekStart ? mealDayPlans : [];

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
  }, [activeTab, mealDayPlans, selectedContext, weekStart]);

  const selectedLabel = useMemo(() => {
    if (!selectedContext || selectedContext.view !== activeTab) {
      return "可先点击计划中的某一天（或某一项）作为上下文，再开始提问。";
    }
    const base = `${selectedContext.weekStart} 周 / ${selectedContext.date}`;
    if (selectedContext.selectionType === "day") return `已选中：${base}`;
    return `已选中：${base} / ${String(selectedContext.slotType ?? "")}`;
  }, [activeTab, selectedContext]);

  return (
    <div className="app-page">
      <PageHeader title="健康计划" subtitle="饮食与训练安排一站式管理" />

      {notice ? (
        <div
          className={
            notice.type === "error"
              ? "rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              : notice.type === "warning"
                ? "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"
                : "rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700"
          }
        >
          {notice.text}
        </div>
      ) : null}

      <section className="rounded-2xl border-2 border-line bg-panel p-4 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("meals")}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                activeTab === "meals" ? "bg-primary text-white" : "border border-line text-ink"
              }`}
            >
              🍽️ 一周三餐
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("workouts")}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                activeTab === "workouts" ? "bg-primary text-white" : "border border-line text-ink"
              }`}
            >
              🏋️ 一周健身计划
            </button>
          </div>

          <div className="relative flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">近期目标</span>
            <select
              value={healthGoal}
              onChange={(event) => {
                const normalized = normalizeHealthGoal(event.target.value) ?? DEFAULT_HEALTH_GOAL;
                void persistHealthGoal(normalized);
              }}
              className="min-w-40 rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              {HEALTH_GOAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Link href="/profile#body" prefetch={false} className="text-sm font-medium text-primary hover:opacity-80">
              完善身体信息
            </Link>
            <button
              ref={chatTriggerRef}
              type="button"
              onClick={() => setIsChatOpen((value) => !value)}
              disabled={isLoadingPlans}
              className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isLoadingPlans ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                  加载计划中...
                </span>
              ) : isChatOpen ? (
                "收起对话"
              ) : (
                "和 AI 聊聊"
              )}
            </button>

            {isChatOpen ? (
              <div
                ref={chatPopoverRef}
                className="absolute right-0 top-full z-30 mt-2 w-[min(760px,calc(100vw-56px))] rounded-2xl border border-line bg-white/95 p-3 shadow-soft"
              >
                <span
                  aria-hidden
                  className="absolute -top-2 right-8 h-3 w-3 rotate-45 border-l border-t border-line bg-white/95"
                />
                <p className="mb-2 text-sm text-muted">{selectedLabel}</p>
                <div ref={activeChatScrollRef} className="h-72 overflow-y-auto rounded-xl border border-line bg-slate-50 p-3">
                  {renderChatHistory(activeHistory)}
                </div>
                <div className="mt-3 grid gap-2">
                  <textarea
                    rows={3}
                    placeholder={
                      activeTab === "meals"
                        ? "例如：今天午餐吃什么更合适？"
                        : "例如：这天的训练强度是否合适？如何调整？"
                    }
                    value={activeChatInput}
                    onChange={(event) =>
                      activeTab === "meals" ? setMealChatInput(event.target.value) : setWorkoutChatInput(event.target.value)
                    }
                    className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === "meals") setMealChatHistory([]);
                        else setWorkoutChatHistory([]);
                      }}
                      className="rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink"
                    >
                      清空对话
                    </button>
                    <button
                      type="button"
                      disabled={isSendingActive}
                      onClick={() => sendChatMessage(activeTab)}
                      className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {isSendingActive ? "发送中..." : "发送消息"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {activeTab === "meals" ? (
          <div className="grid gap-4">
            <section className="rounded-xl border border-line bg-white/80 p-3">
              <h4 className="mb-3 text-sm font-semibold text-ink">本周饮食计划</h4>
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
            </section>
          </div>
        ) : (
          <div className="grid gap-4">
            <section className="rounded-xl border border-line bg-white/80 p-3">
              <h4 className="mb-3 text-sm font-semibold text-ink">本周健身计划</h4>
              <WorkoutWeekTable
                data={workoutData}
                highlightDate={todayIso}
                selected={
                  selectedContext?.view === "workouts" && selectedContext.weekStart === weekStart
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
            </section>
          </div>
        )}
      </section>

      {selectedMealRecipe ? (
        <section className="rounded-2xl border-2 border-line bg-panel p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-ink">{`${selectedMealRecipe.date} · ${selectedMealRecipe.label}食谱`}</h3>
            <button
              type="button"
              onClick={() => setSelectedContext(null)}
              className="rounded-lg border border-line px-2 py-1 text-xs text-muted"
            >
              收起
            </button>
          </div>

          {selectedMealRecipe.recipe ? (
            <div className="grid gap-3 text-sm">
              <p className="font-semibold text-ink">{selectedMealRecipe.recipe.name || selectedMealRecipe.mealText || "未命名"}</p>

              <div>
                <p className="text-sm text-muted">食材</p>
                <ul className="mt-1 list-disc pl-5 text-ink">
                  {(selectedMealRecipe.recipe.ingredients ?? []).length ? (
                    (selectedMealRecipe.recipe.ingredients ?? []).map((item, idx) => <li key={`${item}-${idx}`}>{item}</li>)
                  ) : (
                    <li>暂无食材信息</li>
                  )}
                </ul>
              </div>

              <div>
                <p className="text-sm text-muted">步骤</p>
                <ol className="mt-1 list-decimal pl-5 text-ink">
                  {(selectedMealRecipe.recipe.steps ?? []).length ? (
                    (selectedMealRecipe.recipe.steps ?? []).map((step, idx) => <li key={`${step}-${idx}`}>{step}</li>)
                  ) : (
                    <li>暂无制作步骤</li>
                  )}
                </ol>
              </div>

              {selectedMealRecipe.recipe.tips ? (
                <div>
                  <p className="text-sm text-muted">小贴士</p>
                  <p className="mt-1 text-ink">{selectedMealRecipe.recipe.tips}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">该餐暂无食谱，建议重新生成。</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
