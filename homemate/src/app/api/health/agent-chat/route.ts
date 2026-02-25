import { NextResponse } from "next/server";

import { createAgent } from "langchain";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildHealthAgentTools } from "@/lib/health/agentTools";
import { createHealthChatModels } from "@/lib/health/llm";
import {
  DEFAULT_HEALTH_GOAL,
  healthGoalToPrompt,
  normalizeHealthGoal,
} from "@/lib/health/goals";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parseIsoDate = (value: string) => {
  if (!DATE_REGEX.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
};

const isValidTimezone = (value: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch (error) {
    return false;
  }
};

type HealthChatContext = {
  date?: string;
  slotType?: string;
  view?: "meals" | "workouts";
};

type HealthChatBody = {
  message?: string;
  weekStart?: string;
  timezone?: string;
  context?: HealthChatContext;
  goal?: unknown;
};

const CONFIRM_PROCEED_REGEX = /(继续|跳过|不填|不填写|不用填|先不填|先不添加|不想填)/;

const normalizeContent = (content: unknown) => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const combined = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
    return combined || null;
  }
  if (content && typeof content === "object" && "text" in content) {
    return String((content as { text?: unknown }).text ?? "");
  }
  return null;
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerSupabaseClient(request);
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: HealthChatBody;

  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const weekStart = body.weekStart;
  const timezone = body.timezone;

  if (!message) {
    return NextResponse.json({ error: "Missing or invalid message" }, { status: 400 });
  }

  if (!weekStart || typeof weekStart !== "string" || !parseIsoDate(weekStart)) {
    return NextResponse.json(
      { error: "Missing or invalid weekStart" },
      { status: 400 }
    );
  }

  if (!timezone || typeof timezone !== "string" || !isValidTimezone(timezone)) {
    return NextResponse.json(
      { error: "Missing or invalid timezone" },
      { status: 400 }
    );
  }

  const models = createHealthChatModels({ temperature: 0.3 });
  if (!models) {
    return NextResponse.json({ error: "Missing LLM configuration" }, { status: 500 });
  }

  const requestedGoal = normalizeHealthGoal(body.goal);
  let savedGoal = DEFAULT_HEALTH_GOAL;
  if (!requestedGoal) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("health_goal")
      .eq("id", userData.user.id)
      .maybeSingle();
    const normalized = normalizeHealthGoal(
      (profileRow as { health_goal?: unknown } | null)?.health_goal
    );
    if (normalized) savedGoal = normalized;
  }
  const effectiveGoal = requestedGoal ?? savedGoal;

  const { data: metricsRow, error: metricsError } = await supabase
    .from("body_metrics")
    .select(
      "user_id,height_cm,weight_kg,gender,birthday,age,body_fat_pct,muscle_pct,subcutaneous_fat,visceral_fat,bmi,water_pct,protein_pct,bone_mass,bmr"
    )
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (metricsError) {
    return NextResponse.json({ error: "Failed to load body metrics" }, { status: 500 });
  }

  const metricsRecord = (metricsRow ?? null) as Record<string, unknown> | null;
  const hasBodyMetrics = Boolean(
    metricsRecord &&
      (
        metricsRecord.height_cm ||
        metricsRecord.weight_kg ||
        metricsRecord.gender ||
        metricsRecord.birthday ||
        metricsRecord.age ||
        metricsRecord.body_fat_pct ||
        metricsRecord.muscle_pct ||
        metricsRecord.subcutaneous_fat ||
        metricsRecord.visceral_fat ||
        metricsRecord.bmi ||
        metricsRecord.water_pct ||
        metricsRecord.protein_pct ||
        metricsRecord.bone_mass ||
        metricsRecord.bmr
      )
  );

  if (!hasBodyMetrics && !CONFIRM_PROCEED_REGEX.test(message)) {
    return NextResponse.json({
      reply:
        "检测到你还没有填写身体信息（如身高/体重/体脂等），我可以继续给出更通用的建议，但准确性会下降。\n\n你可以先去个人中心填写：/profile#body。\n如果你不想填写，也可以继续：请回复“继续”或“跳过”。",
      context: body.context ?? null,
      requiresConfirmation: true,
    });
  }

  const tools = buildHealthAgentTools({
    supabase,
    userId: userData.user.id,
    weekStart,
    timezone,
  });

  const systemPrompt = `You are a health assistant.

User preference:
- ${healthGoalToPrompt(effectiveGoal)}

Your job: answer the user's questions about their weekly meal/workout plan shown in the calendar table.

Plan awareness:
- Before answering, ALWAYS call the appropriate tool to fetch the latest plan for this weekStart:
  - If view is meals: call get_meal_week_plan
  - If view is workouts: call get_workout_week_plan
- Use the selected date/slotType (if provided) to focus your answer.

Meal ideas (no DB writes):
- If the user asks what to eat for a single meal (e.g. "中午吃什么/晚饭吃什么/加餐吃什么"), call suggest_meal_ideas.
- This tool provides suggestions only and MUST NOT update the plan in the database.

Edits:
- Only call update_* tools if the user explicitly asks to change the plan.

Output:
- Reply in concise plain text in Simplified Chinese. No markdown.`;

  const buildAgent = (model: any) =>
    createAgent({
      model,
      tools,
      systemPrompt,
    });

  const agent = buildAgent(models.primary);

  let result: { messages?: Array<{ content?: unknown }> } | null = null;
  try {
    result = (await agent.invoke({
      messages: [
        {
          role: "user",
          content: `User message: ${message}\nContext: ${JSON.stringify({
            weekStart,
            timezone,
            selected: body.context ?? null,
            goal: effectiveGoal,
          })}\nReturn plain text for the reply.`,
        },
      ],
    })) as { messages?: Array<{ content?: unknown }> };
  } catch (error) {
    if (models.fallback) {
      try {
        const fallbackAgent = buildAgent(models.fallback);
        result = (await fallbackAgent.invoke({
          messages: [
            {
              role: "user",
              content: `User message: ${message}\nContext: ${JSON.stringify({
                weekStart,
                timezone,
                selected: body.context ?? null,
                goal: effectiveGoal,
              })}\nReturn plain text for the reply.`,
            },
          ],
        })) as { messages?: Array<{ content?: unknown }> };
      } catch (fallbackError) {
        const details =
          process.env.NODE_ENV !== "production"
            ? {
                primary: error instanceof Error ? error.message : String(error),
                fallback:
                  fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
              }
            : undefined;
        return NextResponse.json(
          { error: "Agent execution failed", ...(details ? { details } : {}) },
          { status: 502 }
        );
      }
    } else {
      const details =
        process.env.NODE_ENV !== "production"
          ? { message: error instanceof Error ? error.message : String(error) }
          : undefined;
      return NextResponse.json(
        { error: "Agent execution failed", ...(details ? { details } : {}) },
        { status: 502 }
      );
    }
  }

  const lastMessage = result?.messages?.[result.messages.length - 1];
  const reply = normalizeContent(lastMessage?.content)?.trim();
  if (!reply) {
    return NextResponse.json({ error: "Empty agent response" }, { status: 502 });
  }

  return NextResponse.json({
    reply,
    context: body.context ?? null,
  });
}
