import { describe, expect, it } from "vitest";

import {
  normalizeBodyMetricsPayload,
  normalizeGoalPayload,
  normalizeHealthGoalPayload,
  normalizeRefreshPayload,
  normalizeRegisterPayload,
  normalizeReminderPayload,
  normalizeSavingsContributionPayload,
  normalizeTransactionPayload,
} from "../apiPayloads";

describe("normalizeRegisterPayload", () => {
  it("normalizes email, username, and display name", () => {
    expect(
      normalizeRegisterPayload({
        email: "  demo@example.com ",
        password: "secret123",
        username: "  pinkcat ",
        display_name: "  Jisoo  ",
      })
    ).toEqual({
      email: "demo@example.com",
      password: "secret123",
      username: "pinkcat",
      displayName: "Jisoo",
    });
  });

  it("rejects invalid register payloads", () => {
    expect(() => normalizeRegisterPayload({ email: "", password: "123456" })).toThrow(/email/i);
    expect(() => normalizeRegisterPayload({ email: "demo@example.com", password: "123" })).toThrow(/password/i);
    expect(() => normalizeRegisterPayload({ email: "demo@example.com", password: "123456", username: "" })).toThrow(/username/i);
  });
});

describe("normalizeRefreshPayload", () => {
  it("accepts refresh token", () => {
    expect(normalizeRefreshPayload({ refreshToken: "refresh-123" })).toEqual({
      refreshToken: "refresh-123",
    });
  });

  it("rejects missing refresh token", () => {
    expect(() => normalizeRefreshPayload({})).toThrow(/refresh token/i);
  });
});

describe("normalizeTransactionPayload", () => {
  it("normalizes transaction input", () => {
    expect(
      normalizeTransactionPayload({
        type: "expense",
        amount: "88.50",
        currency: " cny ",
        occurredAt: "2026-03-13",
        categoryId: "cat-food",
        note: "  dinner  ",
      })
    ).toEqual({
      type: "expense",
      amount: 88.5,
      currency: "CNY",
      occurredAt: "2026-03-13",
      categoryId: "cat-food",
      note: "dinner",
    });
  });

  it("rejects invalid amount and date", () => {
    expect(() => normalizeTransactionPayload({ type: "expense", amount: 0, occurredAt: "2026-03-13" })).toThrow(/amount/i);
    expect(() => normalizeTransactionPayload({ type: "income", amount: 12, occurredAt: "03-13-2026" })).toThrow(/date/i);
  });
});

describe("normalizeReminderPayload", () => {
  it("normalizes reminder values", () => {
    expect(
      normalizeReminderPayload({
        title: "  School pickup ",
        eventDate: "2026-03-20",
        description: "  6 pm ",
        priority: "high",
        status: "done",
      })
    ).toEqual({
      title: "School pickup",
      eventDate: "2026-03-20",
      description: "6 pm",
      priority: "high",
      status: "done",
    });
  });

  it("defaults missing reminder status and priority", () => {
    expect(
      normalizeReminderPayload({ title: "Bills", eventDate: "2026-03-21" })
    ).toEqual({
      title: "Bills",
      eventDate: "2026-03-21",
      description: null,
      priority: "medium",
      status: "open",
    });
  });
});

describe("normalizeGoalPayload", () => {
  it("normalizes savings goal values", () => {
    expect(
      normalizeGoalPayload({
        title: "  Family trip ",
        target: "6000",
        current: "800",
        deadline: "2026-09-01",
        ruleAmount: "500",
      })
    ).toEqual({
      title: "Family trip",
      target: 6000,
      current: 800,
      deadline: "2026-09-01",
      ruleAmount: 500,
    });
  });

  it("rejects invalid savings target", () => {
    expect(() => normalizeGoalPayload({ title: "Trip", target: "0" })).toThrow(/target/i);
  });
});

describe("normalizeSavingsContributionPayload", () => {
  it("normalizes contribution values", () => {
    expect(
      normalizeSavingsContributionPayload({ goalId: "goal-1", amount: "120", contributedAt: "2026-03-13" })
    ).toEqual({ goalId: "goal-1", amount: 120, contributedAt: "2026-03-13" });
  });
});

describe("normalizeBodyMetricsPayload", () => {
  it("normalizes body metrics values", () => {
    expect(
      normalizeBodyMetricsPayload({
        height_cm: "168",
        weight_kg: "55.4",
        gender: "female",
        birthday: "1998-01-10",
        body_fat_pct: "21.2",
        muscle_pct: "30.1",
      })
    ).toEqual({
      height_cm: 168,
      weight_kg: 55.4,
      gender: "female",
      birthday: "1998-01-10",
      body_fat_pct: 21.2,
      muscle_pct: 30.1,
    });
  });
});

describe("normalizeHealthGoalPayload", () => {
  it("accepts supported health goals", () => {
    expect(normalizeHealthGoalPayload({ healthGoal: "fat_loss" })).toEqual({
      healthGoal: "fat_loss",
    });
  });

  it("rejects unsupported health goals", () => {
    expect(() => normalizeHealthGoalPayload({ healthGoal: "chatty" })).toThrow(/health goal/i);
  });
});
