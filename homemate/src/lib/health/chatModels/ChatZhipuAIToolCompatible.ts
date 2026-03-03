import { ChatZhipuAI } from "@langchain/community/chat_models/zhipuai";
import { ChatMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";

const stringifyToolContent = (content: unknown) => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => String(part ?? "")).join("");
  if (content && typeof content === "object" && "text" in content) {
    return String((content as { text?: unknown }).text ?? "");
  }
  return String(content ?? "");
};

const sanitizeMessages = (messages: BaseMessage[]) => {
  return messages.map((message) => {
    const type = message._getType();
    if (type === "tool") {
      const text = stringifyToolContent(message.content);
      return new ChatMessage(`工具结果：${text}`, "assistant");
    }
    return message;
  });
};

export class ChatZhipuAIToolCompatible extends ChatZhipuAI {
  async _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: any) {
    const sanitized = sanitizeMessages(messages);
    return super._generate(sanitized, options, runManager);
  }
}
