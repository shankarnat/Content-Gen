/**
 * LLM Service - Unified interface for LLM providers
 */

import { LLMProvider, LLMRequest, LLMResponse, ModelInfo, SUPPORTED_MODELS, getProviderForModel, calculateCost } from './types';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';
import { logger } from '../../utils/logger';

export class LLMService {
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProvider: string;

  constructor(config?: { defaultProvider?: string }) {
    this.defaultProvider = config?.defaultProvider || 'openai';
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize OpenAI provider if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAIProvider());
      logger.info('OpenAI provider initialized');
    }

    // Initialize Anthropic provider if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.set('anthropic', new AnthropicProvider());
      logger.info('Anthropic provider initialized');
    }

    if (this.providers.size === 0) {
      logger.warn('No LLM providers initialized - check API keys');
    }
  }

  /**
   * Generate content using the specified model
   */
  async generateContent(request: LLMRequest): Promise<LLMResponse> {
    const providerName = getProviderForModel(request.model);

    if (!providerName) {
      throw new Error(`Unknown model: ${request.model}`);
    }

    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider not available: ${providerName}. Check API key configuration.`);
    }

    logger.info('Generating content', {
      model: request.model,
      provider: providerName,
      promptLength: request.prompt.length,
    });

    const response = await provider.generateContent(request);

    // Calculate cost
    const cost = calculateCost(response.usage.inputTokens, response.usage.outputTokens, request.model);

    logger.info('Content generated', {
      model: request.model,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      cost: `$${cost.toFixed(6)}`,
      latencyMs: response.latencyMs,
    });

    return response;
  }

  /**
   * Generate content and parse as JSON
   */
  async generateJSON<T = Record<string, unknown>>(request: LLMRequest): Promise<{
    data: T;
    response: LLMResponse;
  }> {
    const jsonRequest: LLMRequest = {
      ...request,
      responseFormat: 'json',
    };

    const response = await this.generateContent(jsonRequest);

    try {
      // Try to extract JSON from the response
      const jsonContent = this.extractJSON(response.content);
      const data = JSON.parse(jsonContent) as T;

      return { data, response };
    } catch (error) {
      logger.error('Failed to parse JSON response', {
        content: response.content.substring(0, 500),
        error,
      });
      throw new Error(`Failed to parse LLM response as JSON: ${error}`);
    }
  }

  /**
   * Extract JSON from a string that may contain additional text
   */
  private extractJSON(content: string): string {
    // First, try to parse as-is
    try {
      JSON.parse(content);
      return content;
    } catch {
      // Continue to extraction
    }

    // Try to find JSON object in the content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }

    // Try to find JSON array
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return arrayMatch[0];
    }

    throw new Error('No valid JSON found in response');
  }

  /**
   * Estimate tokens for a given text
   */
  estimateTokens(text: string, model?: string): number {
    const providerName = model ? getProviderForModel(model) : this.defaultProvider;
    const provider = this.providers.get(providerName || this.defaultProvider);

    if (provider) {
      return provider.estimateTokens(text);
    }

    // Fallback estimation
    return Math.ceil(text.length / 4);
  }

  /**
   * Get list of available models
   */
  getAvailableModels(): ModelInfo[] {
    const availableProviders = Array.from(this.providers.keys());
    return SUPPORTED_MODELS.filter((m) => availableProviders.includes(m.provider));
  }

  /**
   * Get model information
   */
  getModelInfo(modelId: string): ModelInfo | undefined {
    return SUPPORTED_MODELS.find((m) => m.id === modelId);
  }

  /**
   * Calculate estimated cost for a request
   */
  estimateCost(inputTokens: number, outputTokens: number, model: string): number {
    return calculateCost(inputTokens, outputTokens, model);
  }

  /**
   * Check if a provider is available
   */
  isProviderAvailable(provider: string): boolean {
    return this.providers.has(provider);
  }
}

// Singleton instance
let llmServiceInstance: LLMService | null = null;

export function getLLMService(): LLMService {
  if (!llmServiceInstance) {
    llmServiceInstance = new LLMService();
  }
  return llmServiceInstance;
}
