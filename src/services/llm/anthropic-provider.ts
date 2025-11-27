/**
 * Anthropic LLM Provider
 */

import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMRequest, LLMResponse, ModelInfo, SUPPORTED_MODELS } from './types';
import { logger } from '../../utils/logger';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateContent(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      let systemPrompt = request.systemPrompt || '';

      // Add JSON instruction if JSON format is requested
      if (request.responseFormat === 'json') {
        systemPrompt = `${systemPrompt}\n\nIMPORTANT: You must respond with valid JSON only. Do not include any text before or after the JSON object.`.trim();
      }

      logger.debug('Anthropic request', { model: request.model, promptLength: request.prompt.length });

      const response = await this.client.messages.create({
        model: this.mapModelId(request.model),
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP ?? 1,
        system: systemPrompt || undefined,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      });

      const latencyMs = Date.now() - startTime;
      const content = response.content[0];
      const textContent = content.type === 'text' ? content.text : '';

      logger.info('Anthropic response received', {
        model: request.model,
        latencyMs,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });

      return {
        content: textContent,
        finishReason: this.mapStopReason(response.stop_reason),
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        model: response.model,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      logger.error('Anthropic error', { error, latencyMs });

      if (error instanceof Anthropic.APIError) {
        throw new Error(`Anthropic API Error: ${error.message} (${error.status})`);
      }
      throw error;
    }
  }

  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  getSupportedModels(): ModelInfo[] {
    return SUPPORTED_MODELS.filter((m) => m.provider === 'anthropic');
  }

  private mapModelId(modelId: string): string {
    const modelMap: Record<string, string> = {
      'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
      'claude-3-opus': 'claude-3-opus-20240229',
      'claude-3-haiku': 'claude-3-haiku-20240307',
    };
    return modelMap[modelId] || modelId;
  }

  private mapStopReason(reason: string | null): LLMResponse['finishReason'] {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'stop';
    }
  }
}
