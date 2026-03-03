import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatZhipuAIToolCompatible } from "./chatModels/ChatZhipuAIToolCompatible";

type HealthLlmProvider = "zhipu" | "deepseek";

type HealthLlmConfig = {
  provider: HealthLlmProvider;
  apiKey: string;
  model: string;
  baseURL?: string;
};

const ZHIPU_DEFAULT_MODEL = "glm-4.7";
const DEEPSEEK_DEFAULT_MODEL = "deepseek-chat";

const getHealthProvider = (): HealthLlmProvider => {
  const provider = process.env.HEALTH_LLM_PROVIDER?.trim().toLowerCase();
  return provider === "deepseek" ? "deepseek" : "zhipu";
};

const getZhipuConfig = (): HealthLlmConfig | null => {
  const zhipuKey = process.env.ZHIPUAI_API_KEY?.trim();
  if (!zhipuKey) return null;
  const baseURL = process.env.ZHIPUAI_API_BASE?.trim();
  const model = process.env.ZHIPUAI_MODEL?.trim() || ZHIPU_DEFAULT_MODEL;
  return {
    provider: "zhipu",
    apiKey: zhipuKey,
    model,
    baseURL: baseURL?.replace(/\/+$/, ""),
  };
};

const getDeepSeekConfig = (): HealthLlmConfig | null => {
  const deepSeekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!deepSeekKey) return null;
  const baseURL = process.env.DEEPSEEK_BASE_URL?.trim();
  const model = process.env.HEALTH_LLM_MODEL?.trim() || DEEPSEEK_DEFAULT_MODEL;
  return {
    provider: "deepseek",
    apiKey: deepSeekKey,
    model,
    baseURL: baseURL?.replace(/\/+$/, ""),
  };
};

export const getHealthLlmConfig = (): HealthLlmConfig | null => {
  const provider = getHealthProvider();
  return provider === "deepseek" ? getDeepSeekConfig() : getZhipuConfig();
};

export const createHealthChatModel = (options: { temperature: number }) => {
  const config = getHealthLlmConfig();
  if (!config) return null;

  if (config.provider === "deepseek") {
    return new ChatDeepSeek({
      apiKey: config.apiKey,
      model: config.model,
      temperature: options.temperature,
      ...(config.baseURL ? { configuration: { baseURL: config.baseURL } } : {}),
    });
  }

  return new ChatZhipuAIToolCompatible({
    apiKey: config.apiKey,
    model: config.model,
    temperature: options.temperature,
    ...(config.baseURL ? { baseURL: config.baseURL } : {}),
  });
};
