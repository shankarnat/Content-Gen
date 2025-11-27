/**
 * OpenAI LLM Provider
 */

import OpenAI from 'openai';
import { LLMProvider, LLMRequest, LLMResponse, ModelInfo, SUPPORTED_MODELS } from './types';
import { logger } from '../../utils/logger';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async generateContent(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      if (request.systemPrompt) {
        messages.push({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      messages.push({
        role: 'user',
        content: request.prompt,
      });

      const completionRequest: OpenAI.Chat.ChatCompletionCreateParams = {
        model: this.mapModelId(request.model),
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 4096,
        top_p: request.topP ?? 1,
      };

      // Add JSON mode if requested
      if (request.responseFormat === 'json') {
        completionRequest.response_format = { type: 'json_object' };
      }

      logger.debug('OpenAI request', { model: request.model, promptLength: request.prompt.length });

      const response = await this.client.chat.completions.create(completionRequest);

      const latencyMs = Date.now() - startTime;
      const choice = response.choices[0];

      logger.info('OpenAI response received', {
        model: request.model,
        latencyMs,
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
      });

      return {
        content: choice.message.content || '',
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        model: response.model,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      logger.error('OpenAI error', { error, latencyMs });

      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API Error: ${error.message} (${error.status})`);
      }
      throw error;
    }
  }

  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  getSupportedModels(): ModelInfo[] {
    return SUPPORTED_MODELS.filter((m) => m.provider === 'openai');
  }

  private mapModelId(modelId: string): string {
    const modelMap: Record<string, string> = {
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4-turbo': 'gpt-4-turbo',
    };
    return modelMap[modelId] || modelId;
  }

  private mapFinishReason(reason: string | null): LLMResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}
