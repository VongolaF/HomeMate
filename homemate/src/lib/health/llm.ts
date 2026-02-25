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

type HealthChatModels = {
  primary: ChatOpenAICompatible;
  fallback: ChatOpenAICompatible | null;
  provider: HealthLlmConfig["provider"];
};

const getZhipuConfig = (): HealthLlmConfig | null => {
  const zhipuKey = process.env.ZHIPUAI_API_KEY?.trim();
  if (!zhipuKey) return null;
  const baseURL = (process.env.ZHIPUAI_API_BASE?.trim() || ZHIPU_DEFAULT_BASE_URL).replace(
    /\/+$/,
    ""
  );
  const model = process.env.ZHIPUAI_MODEL?.trim() || ZHIPU_DEFAULT_MODEL;
  return {
    provider: "zhipu",
    apiKey: zhipuKey,
    model,
    baseURL,
  };
};

const getOpenAICompatibleConfig = (): HealthLlmConfig | null => {
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

export const getHealthLlmConfig = (): HealthLlmConfig | null => {
  return getZhipuConfig() ?? getOpenAICompatibleConfig();
};

export const createHealthChatModels = (options: { temperature: number }): HealthChatModels | null => {
  const zhipu = getZhipuConfig();
  const openAiCompat = getOpenAICompatibleConfig();

  if (zhipu) {
    return {
      provider: "zhipu",
      primary: new ChatZhipuAI({
        apiKey: zhipu.apiKey,
        model: zhipu.model,
        baseURL: zhipu.baseURL,
        temperature: options.temperature,
      }),
      fallback: openAiCompat
        ? new ChatOpenAICompatible({
            apiKey: openAiCompat.apiKey,
            model: openAiCompat.model,
            baseURL: openAiCompat.baseURL,
            temperature: options.temperature,
          })
        : null,
    };
  }

  if (openAiCompat) {
    return {
      provider: "openai_compatible",
      primary: new ChatOpenAICompatible({
        apiKey: openAiCompat.apiKey,
        model: openAiCompat.model,
        baseURL: openAiCompat.baseURL,
        temperature: options.temperature,
      }),
      fallback: null,
    };
  }

  return null;
};

export const createHealthChatModel = (options: { temperature: number }) => {
  const models = createHealthChatModels(options);
  return models?.primary ?? null;
};
