import { NextResponse } from "next/server";

import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildHealthAgentTools } from "@/lib/health/agentTools";

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

  const llmApiKey = process.env.HEALTH_LLM_API_KEY;
  const llmModel = process.env.HEALTH_LLM_MODEL;
  const llmApiBase = process.env.HEALTH_LLM_API_BASE;

  if (!llmApiKey || !llmModel || !llmApiBase) {
    return NextResponse.json(
      { error: "Missing LLM configuration" },
      { status: 500 }
    );
  }

  const tools = buildHealthAgentTools({
    supabase,
    userId: userData.user.id,
    weekStart,
    timezone,
  });

  const systemPrompt = `You are a health assistant. Use tools to update plans when needed.
Context includes weekStart, timezone, and optional selection fields. Use raw slotType text as provided.
When updating plans, call tools with JSON input strings. Keep replies concise and helpful.`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    [
      "human",
      "User message: {input}\nContext: {context}\nReturn plain text for the reply.",
    ],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  const llm = new ChatOpenAI({
    apiKey: llmApiKey,
    model: llmModel,
    temperature: 0.3,
    configuration: {
      baseURL: llmApiBase,
    },
  });

  const agent = await createOpenAIToolsAgent({
    llm,
    tools,
    prompt,
  });

  const executor = new AgentExecutor({
    agent,
    tools,
  });

  let result: { output?: string } | null = null;
  try {
    result = (await executor.invoke({
      input: message,
      context: JSON.stringify({
        weekStart,
        timezone,
        selected: body.context ?? null,
      }),
    })) as { output?: string };
  } catch (error) {
    return NextResponse.json({ error: "Agent execution failed" }, { status: 502 });
  }

  const reply = result?.output?.trim();
  if (!reply) {
    return NextResponse.json({ error: "Empty agent response" }, { status: 502 });
  }

  return NextResponse.json({
    reply,
    context: body.context ?? null,
  });
}
