# Health Agent Chat Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-turn chat history, fix tool message errors, and add a full-week regeneration tool for the active tab only.

**Architecture:** Keep the existing regenerate-week route for UI use. Add a history payload from the client and sanitize it on the server before invoking the agent. Add a new agent tool that regenerates either meal or workout plans for the week, using a prompt and parsing logic similar to the current regenerate-week route.

**Tech Stack:** Next.js App Router, TypeScript, LangChain createAgent + DynamicTool, Supabase, Vitest.

---

### Task 1: Add a history builder on the health page

**Files:**
- Modify: homemate/src/app/health/page.tsx

**Step 1: Write the failing test**

We do not have a direct UI test for chat history. Skip to implementation and verify via manual test after wiring the API.

**Step 2: Write minimal implementation**

Add a helper that builds a 12-message history payload from the active chat history.

```tsx
const buildHistoryPayload = (history: ChatMessage[]) => {
  return history
    .filter((item) => item.status !== "loading" && item.status !== "error")
    .filter((item) => item.content.trim().length > 0)
    .slice(-12)
    .map((item) => ({ role: item.role, content: item.content.trim() }));
};
```

Use it inside `sendChatMessage` before calling `/api/health/agent-chat`:

```tsx
const historyPayload = buildHistoryPayload(isMeals ? mealChatHistory : workoutChatHistory);

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
```

Make sure the `useCallback` dependency list includes `mealChatHistory` and `workoutChatHistory`.

**Step 3: Manual check**

Run the app and send 2-3 turns. Confirm the request payload contains `history` and the agent replies with context from prior turns.

---

### Task 2: Sanitize history in agent-chat route

**Files:**
- Create: homemate/src/lib/health/chatHistory.ts
- Modify: homemate/src/app/api/health/agent-chat/route.ts

**Step 1: Write the failing test**

Create a focused unit test for history sanitization.

```ts
// homemate/src/lib/health/__tests__/chatHistory.test.ts
import { describe, expect, it } from "vitest";
import { sanitizeChatHistory } from "../chatHistory";

describe("sanitizeChatHistory", () => {
  it("keeps only user/assistant roles, trims, caps to 12", () => {
    const input = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: ` msg ${i} `,
    }));

    const output = sanitizeChatHistory(input);
    expect(output).toHaveLength(12);
    expect(output[0].content).toBe("msg 3");
    expect(output[11].content).toBe("msg 14");
  });

  it("drops invalid roles and empty content", () => {
    const output = sanitizeChatHistory([
      { role: "system", content: "no" },
      { role: "user", content: "  " },
      { role: "assistant", content: "ok" },
    ]);

    expect(output).toEqual([{ role: "assistant", content: "ok" }]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- chatHistory.test.ts`
Expected: FAIL with module not found or missing export.

**Step 3: Write minimal implementation**

```ts
// homemate/src/lib/health/chatHistory.ts
export type ChatHistoryItem = { role: "user" | "assistant"; content: string };

type RawHistoryItem = { role?: unknown; content?: unknown };

export const sanitizeChatHistory = (history: unknown): ChatHistoryItem[] => {
  if (!Array.isArray(history)) return [];

  const normalized = history
    .map((item) => (item && typeof item === "object" ? (item as RawHistoryItem) : null))
    .filter((item): item is RawHistoryItem => Boolean(item))
    .map((item) => ({
      role: item.role,
      content: typeof item.content === "string" ? item.content.trim() : "",
    }))
    .filter(
      (item): item is { role: "user" | "assistant"; content: string } =>
        (item.role === "user" || item.role === "assistant") && item.content.length > 0
    );

  return normalized.slice(-12);
};
```

Use it in the route:

```ts
type HealthChatBody = {
  message?: string;
  weekStart?: string;
  timezone?: string;
  context?: HealthChatContext;
  goal?: unknown;
  history?: unknown;
};

const history = sanitizeChatHistory(body.history);
```

Then build agent messages with history before the final user message:

```ts
const agentMessages = [
  ...history,
  {
    role: "user" as const,
    content: `User message: ${message}\nContext: ${JSON.stringify({
      weekStart,
      timezone,
      selected: body.context ?? null,
      goal: effectiveGoal,
    })}\nReturn plain text for the reply.`,
  },
];

result = await agent.invoke({ messages: agentMessages });
```

**Step 4: Run test to verify it passes**

Run: `npm test -- chatHistory.test.ts`
Expected: PASS.

---

### Task 3: Add a full-week regeneration tool for the active tab

**Files:**
- Modify: homemate/src/lib/health/agentTools.ts
- Modify: homemate/src/app/api/health/agent-chat/route.ts

**Step 1: Write the failing test**

Skip tool unit test for now. We will validate with manual checks and rely on existing Supabase integration.

**Step 2: Write minimal implementation**

Add a new tool function to regenerate the week for a given view. Use prompts and parsing logic aligned with `regenerate-week` (meals/workouts), but only upsert the targeted plan type. For example:

```ts
const regenerateWeekPlan = async (input: string, context: AgentToolContext) => {
  const payload = parseJsonInput(input) as {
    weekStart?: unknown;
    view?: unknown;
    timezone?: unknown;
    goal?: unknown;
    allowMissingBodyMetrics?: unknown;
  } | null;

  if (!payload) return "Invalid tool input. Provide JSON.";

  const weekStart = validateWeekStart(payload.weekStart, context);
  if (!weekStart) return "Invalid weekStart.";

  const view = payload.view === "workouts" ? "workouts" : "meals";
  const timezone = typeof payload.timezone === "string" ? payload.timezone : context.timezone;
  if (!timezone) return "Invalid timezone.";

  // Load body metrics and build prompts like regenerate-week.
  // Generate JSON using LLM and parse it.
  // If view === "meals", upsert meal_week_plans + meal_day_plans only.
  // If view === "workouts", upsert workout_week_plans + workout_day_plans only.

  return view === "meals" ? "Meal week regenerated." : "Workout week regenerated.";
};
```

Register the tool:

```ts
new DynamicTool({
  name: "regenerate_week_plan",
  description:
    "Regenerate the current week plan for meals or workouts. Input JSON: { weekStart, view, timezone, goal, allowMissingBodyMetrics? }",
  func: (input) => regenerateWeekPlan(input, context),
}),
```

Update the agent system prompt to mention the new tool and when to use it. In `agent-chat/route.ts`, add guidance in the system prompt under a new section “Regeneration” so the agent knows it can call `regenerate_week_plan` only when the user explicitly asks to regenerate the current week for the active tab.

**Step 3: Manual check**

In the UI, ask the agent to “重新生成本周餐单” while in meals tab, then verify the meal table updates and the workout plan remains unchanged.

---

### Task 4: Manual regression checks

**Files:**
- No code changes

**Step 1: Verify multi-turn behavior**

Send 3 turns in meals and workouts chat. Confirm the agent references earlier replies.

**Step 2: Verify tool error is fixed**

Trigger a tool call (e.g. meal suggestion) and confirm no “Unknown message type: tool” error.

**Step 3: Verify regeneration tool**

Ask to regenerate meals or workouts and confirm only the active tab updates.

---

Plan complete and saved to docs/plans/2026-02-27-health-agent-chat-implementation.md. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
