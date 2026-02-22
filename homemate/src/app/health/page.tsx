"use client";

import { Button, Card, Col, Input, Row, Space, Typography, message, theme } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MealWeekTable, { type MealDayPlan, type MealSlot } from "@/components/health/MealWeekTable";
import WorkoutWeekTable, { type WorkoutDayPlan, type WorkoutSlot } from "@/components/health/WorkoutWeekTable";
import { supabase } from "@/lib/supabase/client";

type SelectedContext =
  | {
      date: string;
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
};

type WorkoutDayPlanApi = {
  date: string;
  cardio?: string | null;
  strength?: string | null;
  duration_min?: number | null;
  notes?: string | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type HealthPlanResponse<T> = {
  weekPlan: Record<string, unknown> | null;
  dayPlans: T[];
};

const weekdayLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

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

export default function HealthPage() {
  const { token } = theme.useToken();
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState<"meals" | "workouts">("meals");
  const [selectedContext, setSelectedContext] = useState<SelectedContext>(null);
  const [mealDayPlans, setMealDayPlans] = useState<MealDayPlanApi[]>([]);
  const [workoutDayPlans, setWorkoutDayPlans] = useState<WorkoutDayPlanApi[]>([]);
  const [mealChatInput, setMealChatInput] = useState("");
  const [workoutChatInput, setWorkoutChatInput] = useState("");
  const [mealChatHistory, setMealChatHistory] = useState<ChatMessage[]>([]);
  const [workoutChatHistory, setWorkoutChatHistory] = useState<ChatMessage[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isSendingMeal, setIsSendingMeal] = useState(false);
  const [isSendingWorkout, setIsSendingWorkout] = useState(false);

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

            return (
              <div
                key={`${item.role}-${index}`}
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
                    <Typography.Text style={{ whiteSpace: "pre-wrap" }}>{item.content}</Typography.Text>
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
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);

  const mealData = useMemo(() => createMealData(weekDays, mealDayPlans), [mealDayPlans, weekDays]);
  const workoutData = useMemo(
    () => createWorkoutData(weekDays, workoutDayPlans),
    [weekDays, workoutDayPlans]
  );

  const getAccessToken = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      messageApi.error("Unable to read session.");
      return null;
    }
    return data.session?.access_token ?? null;
  }, [messageApi]);

  const loadPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        messageApi.warning("Please login first.");
        return;
      }

      const query = new URLSearchParams({ weekStart }).toString();
      const headers = { Authorization: `Bearer ${token}` };

      const [mealResponse, workoutResponse] = await Promise.all([
        fetch(`/api/health/meal?${query}`, { headers }),
        fetch(`/api/health/workout?${query}`, { headers }),
      ]);

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
      messageApi.error(error instanceof Error ? error.message : "Failed to load plans");
    } finally {
      setIsLoadingPlans(false);
    }
  }, [getAccessToken, messageApi, weekStart]);

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
      const context = hasSelection
        ? {
            view,
            date: selectedContext?.date,
            slotType: selectedContext?.selectionType === "slot" ? selectedContext?.slotType : undefined,
          }
        : { view };

      if (isMeals) {
        setMealChatHistory((prev) => [...prev, { role: "user", content: trimmed }]);
        setMealChatInput("");
        setIsSendingMeal(true);
      } else {
        setWorkoutChatHistory((prev) => [...prev, { role: "user", content: trimmed }]);
        setWorkoutChatInput("");
        setIsSendingWorkout(true);
      }

      try {
        const token = await getAccessToken();
        if (!token) {
          messageApi.warning("Please login first.");
          return;
        }

        if (!hasSelection) {
          const regenResponse = await fetch("/api/health/regenerate-week", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ weekStart, timezone }),
          });

          if (!regenResponse.ok) {
            const payload = await parseJson<{ error?: string }>(regenResponse);
            throw new Error(payload?.error || "Failed to regenerate week plan");
          }

          await loadPlans();
        }

        const response = await fetch("/api/health/agent-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: trimmed,
            weekStart,
            timezone,
            context,
          }),
        });

        if (!response.ok) {
          const payload = await parseJson<{ error?: string }>(response);
          throw new Error(payload?.error || "Agent request failed");
        }

        const payload = await parseJson<{ reply?: string }>(response);
        const reply = payload?.reply?.trim();
        if (!reply) throw new Error("Empty agent response");

        if (isMeals) {
          setMealChatHistory((prev) => [...prev, { role: "assistant", content: reply }]);
        } else {
          setWorkoutChatHistory((prev) => [...prev, { role: "assistant", content: reply }]);
        }
      } catch (error) {
        messageApi.error(error instanceof Error ? error.message : "Agent request failed");
      } finally {
        if (isMeals) setIsSendingMeal(false);
        else setIsSendingWorkout(false);
      }
    },
    [
      getAccessToken,
      loadPlans,
      mealChatInput,
      messageApi,
      selectedContext,
      timezone,
      weekStart,
      workoutChatInput,
    ]
  );

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const updateSelection = useCallback(
    (
      view: "meals" | "workouts",
      next: { date: string; selectionType: "day" | "slot"; slotType?: MealSlot | WorkoutSlot }
    ) => {
      setSelectedContext((prev) => {
        if (
          prev &&
          prev.view === view &&
          prev.date === next.date &&
          prev.selectionType === next.selectionType &&
          prev.slotType === next.slotType
        ) {
          return null;
        }
        return { view, ...next };
      });
    },
    []
  );

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
        {activeTab === "meals" ? (
          <Row gutter={[16, 16]} align="stretch">
            <Col xs={24} lg={16} style={{ display: "flex" }}>
              <Card
                title="本周饮食计划"
                loading={isLoadingPlans}
                styles={{ body: { paddingTop: 12 } }}
                style={{ minHeight: 680, height: "100%", flex: 1 }}
              >
                <MealWeekTable
                  data={mealData}
                  selected={
                    selectedContext?.view === "meals"
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
                  onSelect={(selection) => updateSelection("meals", selection)}
                />
              </Card>
            </Col>
            <Col xs={24} lg={8} style={{ display: "flex" }}>
              <Card
                title="健康助理"
                styles={{ body: { paddingTop: 12, display: "flex", flexDirection: "column" } }}
                style={{ minHeight: 680, height: "100%", flex: 1 }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
                  <Typography.Text type="secondary">
                    {selectedContext?.view === "meals"
                      ? selectedContext.selectionType === "day"
                        ? `已选中：${selectedContext.date}`
                        : `已选中：${selectedContext.date} / ${selectedContext.slotType}`
                      : "可先点击左侧某一天（或某一餐）作为上下文，再开始提问；也可以直接提问自动生成整周。"}
                  </Typography.Text>

                  <div
                    ref={mealChatScrollRef}
                    style={{
                      flex: 1,
                      minHeight: 360,
                      overflowY: "auto",
                      padding: 12,
                      borderRadius: 12,
                      background: token.colorBgLayout,
                      border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                  >
                    {renderChatHistory(mealChatHistory)}
                  </div>

                  <div
                    style={{
                      borderTop: `1px solid ${token.colorBorderSecondary}`,
                      paddingTop: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="例如：这天的早餐热量会不会太高？能替换成更健康的吗？"
                      value={mealChatInput}
                      onChange={(event) => setMealChatInput(event.target.value)}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        type="primary"
                        loading={isSendingMeal}
                        onClick={() => sendChatMessage("meals")}
                      >
                        发送
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        ) : (
          <Row gutter={[16, 16]} align="stretch">
            <Col xs={24} lg={16} style={{ display: "flex" }}>
              <Card
                title="本周健身计划"
                loading={isLoadingPlans}
                styles={{ body: { paddingTop: 12 } }}
                style={{ minHeight: 680, height: "100%", flex: 1 }}
              >
                <WorkoutWeekTable
                  data={workoutData}
                  selected={
                    selectedContext?.view === "workouts"
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
                  onSelect={(selection) => updateSelection("workouts", selection)}
                />
              </Card>
            </Col>
            <Col xs={24} lg={8} style={{ display: "flex" }}>
              <Card
                title="训练助理"
                styles={{ body: { paddingTop: 12, display: "flex", flexDirection: "column" } }}
                style={{ minHeight: 680, height: "100%", flex: 1 }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
                  <Typography.Text type="secondary">
                    {selectedContext?.view === "workouts"
                      ? selectedContext.selectionType === "day"
                        ? `已选中：${selectedContext.date}`
                        : `已选中：${selectedContext.date} / ${selectedContext.slotType}`
                      : "可先点击左侧某一天（或某项训练）作为上下文，再开始提问；也可以直接提问自动生成整周。"}
                  </Typography.Text>

                  <div
                    ref={workoutChatScrollRef}
                    style={{
                      flex: 1,
                      minHeight: 360,
                      overflowY: "auto",
                      padding: 12,
                      borderRadius: 12,
                      background: token.colorBgLayout,
                      border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                  >
                    {renderChatHistory(workoutChatHistory)}
                  </div>

                  <div
                    style={{
                      borderTop: `1px solid ${token.colorBorderSecondary}`,
                      paddingTop: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="例如：这天的有氧和无氧安排合理吗？如何优化强度和恢复？"
                      value={workoutChatInput}
                      onChange={(event) => setWorkoutChatInput(event.target.value)}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        type="primary"
                        loading={isSendingWorkout}
                        onClick={() => sendChatMessage("workouts")}
                      >
                        发送
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        )}
      </Card>
    </div>
  );
}
