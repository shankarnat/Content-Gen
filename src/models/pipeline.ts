/**
 * Pipeline - Defines a complete content generation workflow
 */

import { PipelineInputConfig } from './dmo';
import { PromptTemplate } from './prompt-template';

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  status: PipelineStatus;
  inputConfig: PipelineInputConfig;
  steps: PipelineStep[];
  outputConfig: PipelineOutputConfig;
  modelConfig: ModelConfig;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export type PipelineStatus = 'draft' | 'active' | 'paused' | 'archived';

/**
 * A single step in the pipeline - can reference output from previous steps
 */
export interface PipelineStep {
  id: string;
  name: string;
  order: number;
  templateId: string;
  template?: PromptTemplate; // Resolved template
  inputMappings?: StepInputMapping[]; // Override default field mappings
  outputKey: string; // Key to store step output for chaining
  condition?: StepCondition; // Optional conditional execution
}

export interface StepInputMapping {
  placeholder: string; // e.g., '{{PreviousStep.Category}}'
  source: 'dmo' | 'previous_step';
  sourceKey: string; // DMO field or previous step output key
}

export interface StepCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: unknown;
}

/**
 * Output configuration - where to write generated content
 */
export interface PipelineOutputConfig {
  targetDMO: string;
  mode: 'update' | 'insert' | 'upsert';
  fieldMappings: OutputFieldMapping[];
  keyField?: string; // For upsert mode
}

export interface OutputFieldMapping {
  sourceField: string; // Output field from template
  targetField: string; // DMO field to write to
  transform?: FieldTransform;
}

export interface FieldTransform {
  type: 'stringify' | 'parse_json' | 'truncate' | 'uppercase' | 'lowercase';
  options?: Record<string, unknown>;
}

/**
 * Model configuration for LLM calls
 */
export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'bedrock';
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * Execution tracking
 */
export interface PipelineExecution {
  id: string;
  pipelineId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors?: ExecutionError[];
  tokenUsage?: TokenUsage;
}

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ExecutionError {
  recordId: string;
  stepId: string;
  error: string;
  timestamp: Date;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

/**
 * Test run request - for playground functionality
 */
export interface TestRunRequest {
  templateId: string;
  prompt: string; // Resolved prompt with variables substituted
  model: string;
  outputFields: string[];
  context?: {
    primaryRecord: Record<string, unknown>;
    relatedRecords?: Record<string, Record<string, unknown> | null>;
  };
}

export interface TestRunResponse {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  tokenUsage?: TokenUsage;
  latencyMs: number;
}
