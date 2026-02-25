export type HealthGoal =
  | "balanced"
  | "fat_loss"
  | "muscle_gain"
  | "endurance"
  | "strength"
  | "mobility"
  | "sleep"
  | "blood_sugar";

export const DEFAULT_HEALTH_GOAL: HealthGoal = "balanced";

export const HEALTH_GOAL_OPTIONS: Array<{
  value: HealthGoal;
  label: string;
  hint: string;
}> = [
  { value: "fat_loss", label: "减脂", hint: "轻热量缺口、优先蛋白与饱腹感、训练偏消耗+力量维持" },
  { value: "muscle_gain", label: "增肌", hint: "蛋白充足、适度热量盈余、力量训练优先" },
  { value: "balanced", label: "均衡", hint: "饮食与训练均衡安排，可持续为主" },
  { value: "endurance", label: "提升心肺", hint: "有氧为主，逐步增加时长/强度" },
  { value: "strength", label: "增强力量", hint: "力量训练为主，合理分化与恢复" },
  { value: "mobility", label: "改善体态/灵活性", hint: "拉伸、活动度、核心稳定与姿势练习" },
  { value: "sleep", label: "改善睡眠", hint: "规律作息、晚间饮食与训练强度更温和" },
  { value: "blood_sugar", label: "控糖/代谢", hint: "低升糖饮食结构、餐后活动、力量+有氧结合" },
];

export function normalizeHealthGoal(value: unknown): HealthGoal | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const allowed = new Set<HealthGoal>(HEALTH_GOAL_OPTIONS.map((opt) => opt.value));
  return allowed.has(trimmed as HealthGoal) ? (trimmed as HealthGoal) : null;
}

export function healthGoalToPrompt(goal: HealthGoal) {
  const option = HEALTH_GOAL_OPTIONS.find((opt) => opt.value === goal);
  if (!option) return `近期目标：${goal}`;
  return `近期目标：${option.label}（${option.hint}）`;
}
