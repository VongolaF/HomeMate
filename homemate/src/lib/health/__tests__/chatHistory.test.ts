import { describe, expect, it } from "vitest";

import { sanitizeChatHistory } from "../chatHistory";

describe("sanitizeChatHistory", () => {
  it("keeps only user/assistant roles with trimmed content", () => {
    const result = sanitizeChatHistory([
      { role: "system", content: "skip" },
      { role: "user", content: "  hello  " },
      { role: "assistant", content: "  hi  " },
      { role: "assistant", content: "   " },
      { role: "user", content: "" },
      { role: "user", content: "ok" },
      { role: 123, content: "bad" },
      "invalid",
    ]);

    expect(result).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
      { role: "user", content: "ok" },
    ]);
  });

  it("caps history to the last 12 messages", () => {
    const input = Array.from({ length: 13 }, (_, index) => ({
      role: "user",
      content: `message-${index + 1}`,
    }));

    const result = sanitizeChatHistory(input);

    expect(result).toHaveLength(12);
    expect(result[0]?.content).toBe("message-2");
    expect(result[11]?.content).toBe("message-13");
  });
});
