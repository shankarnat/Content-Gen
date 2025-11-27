/**
 * LLM Service Types
 */

export interface LLMRequest {
  prompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  responseFormat?: 'text' | 'json';
  systemPrompt?: string;
}

export interface LLMResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  model: string;
  latencyMs: number;
}

export interface LLMProvider {
  name: string;
  generateContent(request: LLMRequest): Promise<LLMResponse>;
  estimateTokens(text: string): number;
  getSupportedModels(): ModelInfo[];
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxOutputTokens: number;
  inputPricePerMToken: number; // Price per million tokens
  outputPricePerMToken: number;
  capabilities: string[];
}

export const SUPPORTED_MODELS: ModelInfo[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    inputPricePerMToken: 2.5,
    outputPricePerMToken: 10,
    capabilities: ['json_mode', 'function_calling', 'vision'],
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    inputPricePerMToken: 0.15,
    outputPricePerMToken: 0.6,
    capabilities: ['json_mode', 'function_calling', 'vision'],
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    inputPricePerMToken: 10,
    outputPricePerMToken: 30,
    capabilities: ['json_mode', 'function_calling', 'vision'],
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    inputPricePerMToken: 3,
    outputPricePerMToken: 15,
    capabilities: ['json_mode', 'vision'],
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    inputPricePerMToken: 15,
    outputPricePerMToken: 75,
    capabilities: ['json_mode', 'vision'],
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 4096,
    inputPricePerMToken: 0.25,
    outputPricePerMToken: 1.25,
    capabilities: ['json_mode', 'vision'],
  },
];

export function getModelInfo(modelId: string): ModelInfo | undefined {
  return SUPPORTED_MODELS.find((m) => m.id === modelId);
}

export function getProviderForModel(modelId: string): 'openai' | 'anthropic' | undefined {
  const model = getModelInfo(modelId);
  return model?.provider as 'openai' | 'anthropic' | undefined;
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  modelId: string
): number {
  const model = getModelInfo(modelId);
  if (!model) return 0;

  const inputCost = (inputTokens / 1_000_000) * model.inputPricePerMToken;
  const outputCost = (outputTokens / 1_000_000) * model.outputPricePerMToken;

  return inputCost + outputCost;
}
