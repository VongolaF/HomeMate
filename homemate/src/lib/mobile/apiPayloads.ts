import { normalizeHealthGoal } from "@/lib/health/goals";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PRIORITIES = new Set(["low", "medium", "high"]);
const STATUSES = new Set(["open", "done"]);
const TRANSACTION_TYPES = new Set(["income", "expense"]);

const ensureObject = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid JSON body");
  }
  return value as Record<string, unknown>;
};

const readText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const readRequiredText = (value: unknown, label: string) => {
  const text = readText(value);
  if (!text) throw new Error(`Missing ${label}`);
  return text;
};

const readOptionalText = (value: unknown) => {
  if (value == null) return null;
  const text = readText(value);
  return text || null;
};

const readNumber = (value: unknown, label: string, options?: { min?: number; defaultValue?: number }) => {
  if ((value == null || value === "") && typeof options?.defaultValue === "number") {
    return options.defaultValue;
  }
  const raw = typeof value === "string" ? value.trim() : value;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ${label}`);
  if (typeof options?.min === "number" && parsed < options.min) {
    throw new Error(`Invalid ${label}`);
  }
  return parsed;
};

const readOptionalNumber = (value: unknown) => {
  if (value == null || value === "") return null;
  const raw = typeof value === "string" ? value.trim() : value;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(parsed)) throw new Error("Invalid numeric value");
  return parsed;
};

const readDate = (value: unknown, label: string) => {
  const text = readRequiredText(value, label);
  if (!ISO_DATE_REGEX.test(text)) throw new Error(`Invalid ${label}`);
  return text;
};

export function normalizeRegisterPayload(value: unknown) {
  const body = ensureObject(value);
  const email = readRequiredText(body.email, "email").toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const displayName = readOptionalText(body.display_name) ?? readOptionalText(body.displayName);

  if (password.length < 6) throw new Error("Invalid password");

  const username = readRequiredText(body.username, "username");

  return {
    email,
    password,
    username,
    displayName,
  };
}

export function normalizeRefreshPayload(value: unknown) {
  const body = ensureObject(value);
  return {
    refreshToken: readRequiredText(body.refreshToken, "refresh token"),
  };
}

export function normalizeTransactionPayload(value: unknown) {
  const body = ensureObject(value);
  const type = readRequiredText(body.type, "type");
  if (!TRANSACTION_TYPES.has(type)) throw new Error("Invalid transaction type");

  return {
    type: type as "income" | "expense",
    amount: readNumber(body.amount, "amount", { min: 0.01 }),
    currency: readOptionalText(body.currency)?.toUpperCase() ?? "CNY",
    occurredAt: readDate(body.occurredAt ?? body.occurred_at, "date"),
    categoryId: readOptionalText(body.categoryId ?? body.category_id),
    note: readOptionalText(body.note),
  };
}

export function normalizeReminderPayload(value: unknown) {
  const body = ensureObject(value);
  const priority = readOptionalText(body.priority) ?? "medium";
  const status = readOptionalText(body.status) ?? "open";

  if (!PRIORITIES.has(priority)) throw new Error("Invalid priority");
  if (!STATUSES.has(status)) throw new Error("Invalid status");

  return {
    title: readRequiredText(body.title, "title"),
    eventDate: readDate(body.eventDate ?? body.event_date, "date"),
    description: readOptionalText(body.description),
    priority: priority as "low" | "medium" | "high",
    status: status as "open" | "done",
  };
}

export function normalizeGoalPayload(value: unknown) {
  const body = ensureObject(value);
  return {
    title: readRequiredText(body.title, "title"),
    target: readNumber(body.target ?? body.target_amount, "target", { min: 0.01 }),
    current: readNumber(body.current ?? body.current_amount ?? 0, "current", { min: 0, defaultValue: 0 }),
    deadline: body.deadline == null || body.deadline === "" ? null : readDate(body.deadline, "deadline"),
    ruleAmount: readNumber(body.ruleAmount ?? body.rule_amount ?? 0, "rule amount", {
      min: 0,
      defaultValue: 0,
    }),
  };
}

export function normalizeSavingsContributionPayload(value: unknown) {
  const body = ensureObject(value);
  return {
    goalId: readRequiredText(body.goalId ?? body.goal_id, "goal id"),
    amount: readNumber(body.amount, "amount", { min: 0.01 }),
    contributedAt: readDate(body.contributedAt ?? body.contributed_at, "date"),
  };
}

export function normalizeBodyMetricsPayload(value: unknown) {
  const body = ensureObject(value);
  const numericKeys = [
    "height_cm",
    "weight_kg",
    "body_fat_pct",
    "muscle_pct",
    "subcutaneous_fat",
    "visceral_fat",
    "water_pct",
    "protein_pct",
    "bone_mass",
    "bmr",
  ] as const;

  const payload: Record<string, number | string | null> = {};

  numericKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      payload[key] = readOptionalNumber(body[key]);
    }
  });

  if (Object.prototype.hasOwnProperty.call(body, "gender")) {
    payload.gender = readOptionalText(body.gender);
  }

  if (Object.prototype.hasOwnProperty.call(body, "birthday")) {
    const birthday = body.birthday == null || body.birthday === "" ? null : readDate(body.birthday, "birthday");
    payload.birthday = birthday;
  }

  return payload;
}

export function normalizeHealthGoalPayload(value: unknown) {
  const body = ensureObject(value);
  const healthGoal = normalizeHealthGoal(body.healthGoal ?? body.health_goal);
  if (!healthGoal) throw new Error("Invalid health goal");
  return { healthGoal };
}
