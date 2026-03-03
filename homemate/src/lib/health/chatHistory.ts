export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type RawChatHistoryItem = {
  role?: unknown;
  content?: unknown;
};

export const sanitizeChatHistory = (history: unknown): ChatHistoryMessage[] => {
  if (!Array.isArray(history)) return [];

  const sanitized = history
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const role = (item as RawChatHistoryItem).role;
      if (role !== "user" && role !== "assistant") return null;
      const content = (item as RawChatHistoryItem).content;
      if (typeof content !== "string") return null;
      const trimmed = content.trim();
      if (!trimmed) return null;
      return { role, content: trimmed };
    })
    .filter((item): item is ChatHistoryMessage => Boolean(item));

  if (sanitized.length <= 12) return sanitized;
  return sanitized.slice(-12);
};
