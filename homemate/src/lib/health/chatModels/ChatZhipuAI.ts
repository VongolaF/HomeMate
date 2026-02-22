import type { BaseChatModelParams } from "@langchain/core/language_models/chat_models";
import { ChatOpenAICompatible } from "./ChatOpenAICompatible";

const ZHIPU_DEFAULT_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
const ZHIPU_DEFAULT_MODEL = "glm-4.7";

export type ChatZhipuAIFields = BaseChatModelParams & {
  apiKey: string;
  model?: string;
  baseURL?: string;
  temperature?: number;
};

export class ChatZhipuAI extends ChatOpenAICompatible {
  static lc_name() {
    return "ChatZhipuAI";
  }

  _llmType() {
    return "zhipuai";
  }

  constructor(fields: ChatZhipuAIFields) {
    super({
      ...fields,
      model: fields.model ?? ZHIPU_DEFAULT_MODEL,
      baseURL: (fields.baseURL ?? ZHIPU_DEFAULT_BASE_URL).replace(/\/+$/, ""),
      temperature: fields.temperature ?? 0.2,
      apiKey: fields.apiKey,
    });
  }
}
