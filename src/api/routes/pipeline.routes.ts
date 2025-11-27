/**
 * Pipeline API Routes
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getPipelineExecutor } from '../../services/pipeline';
import { getLLMService } from '../../services/llm';
import { SAMPLE_PROMPT_TEMPLATES } from '../../models/prompt-template';
import { logger } from '../../utils/logger';

const router = Router();

// Request validation schemas
const TestRunRequestSchema = z.object({
  templateId: z.string(),
  prompt: z.string(),
  model: z.string(),
  outputFields: z.array(z.string()),
  context: z.object({
    primaryRecord: z.record(z.unknown()),
    relatedRecords: z.record(z.unknown().nullable()).optional(),
  }).optional(),
});

/**
 * POST /api/pipeline/execute
 * Execute a test run for the playground
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = TestRunRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      logger.warn('Invalid test run request', {
        errors: validationResult.error.errors,
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validationResult.error.errors,
      });
    }

    const request = validationResult.data;

    logger.info('Test run request received', {
      templateId: request.templateId,
      model: request.model,
      promptLength: request.prompt.length,
    });

    // Execute test run
    const executor = getPipelineExecutor();
    const result = await executor.executeTestRun({
      templateId: request.templateId,
      prompt: request.prompt,
      model: request.model,
      outputFields: request.outputFields,
      context: request.context,
    });

    if (result.success) {
      return res.json({
        success: true,
        output: result.output,
        tokenUsage: result.tokenUsage,
        latencyMs: result.latencyMs,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error,
        latencyMs: result.latencyMs,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Test run failed', { error: errorMessage });

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /api/pipeline/templates
 * Get available prompt templates
 */
router.get('/templates', (_req: Request, res: Response) => {
  const templates = SAMPLE_PROMPT_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    tags: t.tags,
    outputFields: t.outputFields.map((f) => ({
      name: f.name,
      type: f.type,
      required: f.required,
    })),
  }));

  res.json({ templates });
});

/**
 * GET /api/pipeline/templates/:id
 * Get a specific prompt template
 */
router.get('/templates/:id', (req: Request, res: Response) => {
  const template = SAMPLE_PROMPT_TEMPLATES.find((t) => t.id === req.params.id);

  if (!template) {
    return res.status(404).json({
      success: false,
      error: 'Template not found',
    });
  }

  res.json({ template });
});

/**
 * GET /api/pipeline/models
 * Get available LLM models
 */
router.get('/models', (_req: Request, res: Response) => {
  const llmService = getLLMService();
  const models = llmService.getAvailableModels();

  res.json({
    models: models.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      contextWindow: m.contextWindow,
      maxOutputTokens: m.maxOutputTokens,
      pricing: {
        inputPerMToken: m.inputPricePerMToken,
        outputPerMToken: m.outputPricePerMToken,
      },
    })),
  });
});

/**
 * POST /api/pipeline/estimate
 * Estimate tokens and cost for a prompt
 */
router.post('/estimate', (req: Request, res: Response) => {
  const { prompt, model, estimatedOutputTokens } = req.body;

  if (!prompt || !model) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: prompt, model',
    });
  }

  const llmService = getLLMService();
  const inputTokens = llmService.estimateTokens(prompt, model);
  const outputTokens = estimatedOutputTokens || 500; // Default estimate
  const estimatedCost = llmService.estimateCost(inputTokens, outputTokens, model);

  res.json({
    inputTokens,
    estimatedOutputTokens: outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCost,
    model,
  });
});

export default router;
