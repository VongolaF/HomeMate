import { NextResponse } from "next/server";

import { createAgent } from "langchain";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildHealthAgentTools } from "@/lib/health/agentTools";
import { createHealthChatModel } from "@/lib/health/llm";

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
};

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

  const llm = createHealthChatModel({ temperature: 0.3 });
  if (!llm) {
    return NextResponse.json({ error: "Missing LLM configuration" }, { status: 500 });
  }

  const tools = buildHealthAgentTools({
    supabase,
    userId: userData.user.id,
    weekStart,
    timezone,
  });

  const systemPrompt = `You are a health assistant.

Your job: answer the user's questions about their weekly meal/workout plan shown in the calendar table.

Plan awareness:
- Before answering, ALWAYS call the appropriate tool to fetch the latest plan for this weekStart:
  - If view is meals: call get_meal_week_plan
  - If view is workouts: call get_workout_week_plan
- Use the selected date/slotType (if provided) to focus your answer.

Edits:
- Only call update_* tools if the user explicitly asks to change the plan.

Output:
- Reply in concise plain text. No markdown.`;

  const agent = createAgent({
    model: llm,
    tools,
    systemPrompt,
  });

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
          })}\nReturn plain text for the reply.`,
        },
      ],
    })) as { messages?: Array<{ content?: unknown }> };
  } catch (error) {
    return NextResponse.json({ error: "Agent execution failed" }, { status: 502 });
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
