import type { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type {
  BaseChatModelCallOptions,
  BaseChatModelParams,
} from "@langchain/core/language_models/chat_models";
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { ToolMessage, defaultToolCallParser } from "@langchain/core/messages/tool";
import type { ToolCall } from "@langchain/core/messages/tool";
import { convertToOpenAITool } from "@langchain/core/utils/function_calling";
import type { ToolDefinition } from "@langchain/core/language_models/base";

export type ChatOpenAICompatibleCallOptions = BaseChatModelCallOptions & {
  max_tokens?: number;
  tools?: ToolDefinition[];
};

export type ChatOpenAICompatibleFields = BaseChatModelParams & {
  apiKey: string;
  model: string;
  baseURL: string;
  temperature: number;
};

type OpenAICompatibleMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

function makeToolCallId() {
  // In Next.js route handlers, globalThis.crypto may or may not exist depending on runtime.
  const cryptoAny = globalThis.crypto as unknown as { randomUUID?: () => string } | undefined;
  if (cryptoAny?.randomUUID) return cryptoAny.randomUUID();
  return `call_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function toolCallsToOpenAI(toolCalls: ToolCall[]) {
  return toolCalls.map((tc) => ({
    id: tc.id ?? makeToolCallId(),
    type: "function" as const,
    function: {
      name: tc.name,
      arguments: JSON.stringify(tc.args ?? {}),
    },
  }));
}

function messageToOpenAI(message: BaseMessage): OpenAICompatibleMessage {
  switch (message.type) {
    case "system":
      return { role: "system", content: message.text };
    case "human":
      return { role: "user", content: message.text };
    case "tool": {
      if (!ToolMessage.isInstance(message)) {
        return { role: "tool", content: message.text };
      }
      return {
        role: "tool",
        content: message.text,
        tool_call_id: message.tool_call_id,
      };
    }
    case "ai": {
      const toolCalls = (message as unknown as { tool_calls?: ToolCall[] }).tool_calls;
      return {
        role: "assistant",
        content: message.text || null,
        ...(toolCalls?.length ? { tool_calls: toolCallsToOpenAI(toolCalls) } : {}),
      };
    }
    default:
      return { role: "user", content: message.text };
  }
}

export class ChatOpenAICompatible extends BaseChatModel<ChatOpenAICompatibleCallOptions> {
  static lc_name() {
    return "ChatOpenAICompatible";
  }

  lc_namespace = ["homemate", "llm"]; 

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseURL: string;
  private readonly temperature: number;
  private readonly defaultTools: ToolDefinition[];

  constructor(fields: ChatOpenAICompatibleFields & { tools?: ToolDefinition[] }) {
    super(fields);
    this.apiKey = fields.apiKey;
    this.model = fields.model;
    this.baseURL = fields.baseURL.replace(/\/+$/, "");
    this.temperature = fields.temperature;
    this.defaultTools = fields.tools ?? [];
  }

  _llmType() {
    return "openai_compatible";
  }

  bindTools(tools: Array<Record<string, any>>, kwargs?: Partial<ChatOpenAICompatibleCallOptions>) {
    const openAiTools = tools.map((t) => convertToOpenAITool(t as any));
    const merged = [...this.defaultTools, ...openAiTools];

    const next = new ChatOpenAICompatible({
      apiKey: this.apiKey,
      model: this.model,
      baseURL: this.baseURL,
      temperature: this.temperature,
      tools: merged,
    });

    // `withConfig` here binds *call options* for downstream invokes.
    return next.withConfig({ ...(kwargs ?? {}), tools: merged } as Partial<ChatOpenAICompatibleCallOptions>);
  }

  async _generate(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ) {
    const url = `${this.baseURL}/chat/completions`;

    const openAiMessages = messages.map(messageToOpenAI);
    const boundTools: ToolDefinition[] = (options as any)?.tools ?? this.defaultTools;

    const payload: Record<string, unknown> = {
      model: this.model,
      messages: openAiMessages,
      temperature: this.temperature,
      stream: false,
    };

    if ((options as any)?.stop?.length) payload.stop = (options as any).stop;
    if ((options as any)?.max_tokens) payload.max_tokens = (options as any).max_tokens;
    if ((options as any)?.tool_choice !== undefined) payload.tool_choice = (options as any).tool_choice;
    if (boundTools.length) payload.tools = boundTools;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: (options as any)?.signal,
    });

    const rawText = await res.text();
    if (!res.ok) {
      throw new Error(`LLM request failed (${res.status}): ${rawText}`);
    }

    const data = JSON.parse(rawText) as any;
    const choice = data?.choices?.[0]?.message;
    const content = (choice?.content ?? "") as string;

    const rawToolCalls = choice?.tool_calls;
    const [tool_calls, invalid_tool_calls] = Array.isArray(rawToolCalls)
      ? defaultToolCallParser(rawToolCalls)
      : [undefined, undefined];

    const aiMessage = new AIMessage({
      content,
      ...(tool_calls?.length ? { tool_calls } : {}),
      ...(invalid_tool_calls?.length ? { invalid_tool_calls } : {}),
      response_metadata: {
        model: data?.model,
      },
    });

    await runManager?.handleLLMNewToken(aiMessage.text);

    return {
      generations: [
        {
          message: aiMessage,
          text: aiMessage.text,
          generationInfo: {
            finish_reason: data?.choices?.[0]?.finish_reason,
          },
        },
      ],
      llmOutput: {
        usage: data?.usage,
        model: data?.model,
      },
    };
  }
}
