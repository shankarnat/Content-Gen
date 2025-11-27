/**
 * Pipeline Executor - Executes content generation pipelines
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Pipeline,
  PipelineExecution,
  PipelineStep,
  TestRunRequest,
  TestRunResponse,
  TokenUsage,
} from '../../models/pipeline';
import { ResolvedRecord } from '../../models/dmo';
import { PromptTemplate, SAMPLE_PROMPT_TEMPLATES } from '../../models/prompt-template';
import { getLLMService } from '../llm';
import { resolveTemplate, buildResolvedRecord } from './template-resolver';
import { extractFields, validateOutputCompleteness } from './output-mapper';
import { logger } from '../../utils/logger';

export interface ExecutionContext {
  pipelineId: string;
  executionId: string;
  stepOutputs: Map<string, Record<string, unknown>>;
}

export interface StepResult {
  stepId: string;
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  tokenUsage: TokenUsage;
  latencyMs: number;
}

/**
 * PipelineExecutor handles the execution of content generation pipelines
 */
export class PipelineExecutor {
  private llmService = getLLMService();

  /**
   * Execute a test run - single record execution for playground
   */
  async executeTestRun(request: TestRunRequest): Promise<TestRunResponse> {
    const startTime = Date.now();

    try {
      logger.info('Starting test run', {
        templateId: request.templateId,
        model: request.model,
        promptLength: request.prompt.length,
      });

      // Get template for output field definitions
      const template = this.getTemplate(request.templateId);

      // Execute LLM call
      const { data, response } = await this.llmService.generateJSON<Record<string, unknown>>({
        prompt: request.prompt,
        model: request.model,
        responseFormat: 'json',
        temperature: 0.7,
      });

      // Validate output completeness
      const validation = validateOutputCompleteness(
        data,
        template?.outputFields || []
      );

      if (!validation.complete) {
        logger.warn('Incomplete LLM output', {
          missingFields: validation.missingFields,
        });
      }

      // Extract and validate fields
      const extractedFields = template
        ? extractFields(data, template.outputFields)
        : data;

      const tokenUsage: TokenUsage = {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
        estimatedCost: this.llmService.estimateCost(
          response.usage.inputTokens,
          response.usage.outputTokens,
          request.model
        ),
      };

      logger.info('Test run completed successfully', {
        templateId: request.templateId,
        latencyMs: Date.now() - startTime,
        tokenUsage,
      });

      return {
        success: true,
        output: extractedFields,
        tokenUsage,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Test run failed', {
        templateId: request.templateId,
        error: errorMessage,
        latencyMs: Date.now() - startTime,
      });

      return {
        success: false,
        error: errorMessage,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute a full pipeline for a batch of records
   */
  async executePipeline(
    pipeline: Pipeline,
    records: ResolvedRecord[]
  ): Promise<PipelineExecution> {
    const executionId = uuidv4();
    const startTime = new Date();

    const execution: PipelineExecution = {
      id: executionId,
      pipelineId: pipeline.id,
      status: 'running',
      startedAt: startTime,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
      },
    };

    logger.info('Starting pipeline execution', {
      pipelineId: pipeline.id,
      executionId,
      recordCount: records.length,
      stepCount: pipeline.steps.length,
    });

    try {
      for (const record of records) {
        const recordResult = await this.executeRecordPipeline(
          pipeline,
          record,
          executionId
        );

        execution.recordsProcessed++;

        if (recordResult.success) {
          execution.recordsSucceeded++;
        } else {
          execution.recordsFailed++;
          if (recordResult.error) {
            execution.errors?.push(recordResult.error);
          }
        }

        // Aggregate token usage
        if (recordResult.tokenUsage && execution.tokenUsage) {
          execution.tokenUsage.inputTokens += recordResult.tokenUsage.inputTokens;
          execution.tokenUsage.outputTokens += recordResult.tokenUsage.outputTokens;
          execution.tokenUsage.totalTokens += recordResult.tokenUsage.totalTokens;
          execution.tokenUsage.estimatedCost += recordResult.tokenUsage.estimatedCost;
        }
      }

      execution.status = execution.recordsFailed > 0 ? 'completed' : 'completed';
      execution.completedAt = new Date();

      logger.info('Pipeline execution completed', {
        pipelineId: pipeline.id,
        executionId,
        recordsProcessed: execution.recordsProcessed,
        recordsSucceeded: execution.recordsSucceeded,
        recordsFailed: execution.recordsFailed,
        totalTokens: execution.tokenUsage?.totalTokens,
        estimatedCost: execution.tokenUsage?.estimatedCost,
      });

      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();

      logger.error('Pipeline execution failed', {
        pipelineId: pipeline.id,
        executionId,
        error,
      });

      return execution;
    }
  }

  /**
   * Execute pipeline for a single record
   */
  private async executeRecordPipeline(
    pipeline: Pipeline,
    record: ResolvedRecord,
    executionId: string
  ): Promise<{
    success: boolean;
    outputs: Record<string, unknown>;
    error?: { recordId: string; stepId: string; error: string; timestamp: Date };
    tokenUsage: TokenUsage;
  }> {
    const context: ExecutionContext = {
      pipelineId: pipeline.id,
      executionId,
      stepOutputs: new Map(),
    };

    const tokenUsage: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
    };

    const outputs: Record<string, unknown> = {};
    const primaryKey = record.primary['id'] || record.primary['CaseId'] || 'unknown';

    // Sort steps by order
    const sortedSteps = [...pipeline.steps].sort((a, b) => a.order - b.order);

    for (const step of sortedSteps) {
      // Check step condition if present
      if (step.condition && !this.evaluateCondition(step.condition, record, context)) {
        logger.debug('Skipping step due to condition', {
          stepId: step.id,
          condition: step.condition,
        });
        continue;
      }

      const stepResult = await this.executeStep(step, record, context, pipeline.modelConfig.model);

      if (!stepResult.success) {
        return {
          success: false,
          outputs,
          error: {
            recordId: String(primaryKey),
            stepId: step.id,
            error: stepResult.error || 'Unknown error',
            timestamp: new Date(),
          },
          tokenUsage,
        };
      }

      // Store step output for chaining
      if (stepResult.output) {
        context.stepOutputs.set(step.outputKey, stepResult.output);
        outputs[step.outputKey] = stepResult.output;
      }

      // Aggregate token usage
      tokenUsage.inputTokens += stepResult.tokenUsage.inputTokens;
      tokenUsage.outputTokens += stepResult.tokenUsage.outputTokens;
      tokenUsage.totalTokens += stepResult.tokenUsage.totalTokens;
      tokenUsage.estimatedCost += stepResult.tokenUsage.estimatedCost;
    }

    return { success: true, outputs, tokenUsage };
  }

  /**
   * Execute a single pipeline step
   */
  private async executeStep(
    step: PipelineStep,
    record: ResolvedRecord,
    context: ExecutionContext,
    model: string
  ): Promise<StepResult> {
    const startTime = Date.now();

    try {
      const template = step.template || this.getTemplate(step.templateId);

      if (!template) {
        throw new Error(`Template not found: ${step.templateId}`);
      }

      // Resolve template with record data and previous step outputs
      const enrichedRecord = this.enrichRecordWithStepOutputs(record, context);
      const { resolvedPrompt } = resolveTemplate(template.template, enrichedRecord);

      // Execute LLM call
      const { data, response } = await this.llmService.generateJSON<Record<string, unknown>>({
        prompt: resolvedPrompt,
        model,
        responseFormat: 'json',
        temperature: 0.7,
      });

      // Extract fields
      const extractedFields = extractFields(data, template.outputFields);

      const tokenUsage: TokenUsage = {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
        estimatedCost: this.llmService.estimateCost(
          response.usage.inputTokens,
          response.usage.outputTokens,
          model
        ),
      };

      return {
        stepId: step.id,
        success: true,
        output: extractedFields,
        tokenUsage,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        stepId: step.id,
        success: false,
        error: errorMessage,
        tokenUsage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
        },
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Enriches a record with outputs from previous steps for chaining
   */
  private enrichRecordWithStepOutputs(
    record: ResolvedRecord,
    context: ExecutionContext
  ): ResolvedRecord {
    const enrichedRelated = { ...record.related };

    // Add step outputs as pseudo-related records
    for (const [outputKey, output] of context.stepOutputs) {
      enrichedRelated[outputKey] = output as Record<string, unknown>;
    }

    return {
      primary: record.primary,
      related: enrichedRelated,
    };
  }

  /**
   * Evaluates a step condition
   */
  private evaluateCondition(
    condition: PipelineStep['condition'],
    record: ResolvedRecord,
    context: ExecutionContext
  ): boolean {
    if (!condition) return true;

    // Get value from record or step outputs
    let value: unknown;

    if (condition.field.includes('.')) {
      const [source, field] = condition.field.split('.');
      if (context.stepOutputs.has(source)) {
        value = context.stepOutputs.get(source)?.[field];
      } else if (record.related[source]) {
        value = record.related[source]?.[field];
      } else {
        value = record.primary[field];
      }
    } else {
      value = record.primary[condition.field];
    }

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      default:
        return true;
    }
  }

  /**
   * Gets a template by ID
   */
  private getTemplate(templateId: string): PromptTemplate | undefined {
    return SAMPLE_PROMPT_TEMPLATES.find((t) => t.id === templateId);
  }
}

// Singleton instance
let executorInstance: PipelineExecutor | null = null;

export function getPipelineExecutor(): PipelineExecutor {
  if (!executorInstance) {
    executorInstance = new PipelineExecutor();
  }
  return executorInstance;
}
