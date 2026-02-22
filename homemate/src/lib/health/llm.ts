import { ChatOpenAICompatible } from "./chatModels/ChatOpenAICompatible";
import { ChatZhipuAI } from "./chatModels/ChatZhipuAI";

type HealthLlmConfig = {
  provider: "zhipu" | "openai_compatible";
  apiKey: string;
  model: string;
  baseURL: string;
};

const ZHIPU_DEFAULT_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
const ZHIPU_DEFAULT_MODEL = "glm-4.7";

export const getHealthLlmConfig = (): HealthLlmConfig | null => {
  const zhipuKey = process.env.ZHIPUAI_API_KEY?.trim();
  if (zhipuKey) {
    const baseURL = (process.env.ZHIPUAI_API_BASE?.trim() || ZHIPU_DEFAULT_BASE_URL).replace(/\/+$/, "");
    const model = process.env.ZHIPUAI_MODEL?.trim() || ZHIPU_DEFAULT_MODEL;
    return {
      provider: "zhipu",
      apiKey: zhipuKey,
      model,
      baseURL,
    };
  }

  const apiKey = process.env.HEALTH_LLM_API_KEY?.trim();
  const model = process.env.HEALTH_LLM_MODEL?.trim();
  const baseURL = process.env.HEALTH_LLM_API_BASE?.trim();

  if (!apiKey || !model || !baseURL) return null;

  return {
    provider: "openai_compatible",
    apiKey,
    model,
    baseURL: baseURL.replace(/\/+$/, ""),
  };
};

export const createHealthChatModel = (options: { temperature: number }) => {
  const config = getHealthLlmConfig();
  if (!config) return null;

  if (config.provider === "zhipu") {
    return new ChatZhipuAI({
      apiKey: config.apiKey,
      model: config.model,
      baseURL: config.baseURL,
      temperature: options.temperature,
    });
  }

  return new ChatOpenAICompatible({
    apiKey: config.apiKey,
    model: config.model,
    baseURL: config.baseURL,
    temperature: options.temperature,
  });
};
