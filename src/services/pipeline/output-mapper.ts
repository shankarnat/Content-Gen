/**
 * Output Mapper - Extracts and maps fields from LLM output
 */

import { OutputFieldDefinition } from '../../models/prompt-template';
import { OutputFieldMapping, FieldTransform } from '../../models/pipeline';
import { logger } from '../../utils/logger';

export interface ExtractedFields {
  [fieldName: string]: unknown;
}

export interface MappingResult {
  success: boolean;
  mappedFields: ExtractedFields;
  errors: string[];
}

/**
 * Extracts fields from LLM JSON output based on field definitions
 */
export function extractFields(
  output: Record<string, unknown>,
  fieldDefinitions: OutputFieldDefinition[]
): ExtractedFields {
  const extracted: ExtractedFields = {};

  for (const fieldDef of fieldDefinitions) {
    const value = output[fieldDef.name];

    if (value !== undefined) {
      extracted[fieldDef.name] = validateAndCoerceField(value, fieldDef);
    } else if (fieldDef.required) {
      logger.warn('Missing required field in LLM output', {
        field: fieldDef.name,
      });
      extracted[fieldDef.name] = getDefaultValue(fieldDef.type);
    }
  }

  return extracted;
}

/**
 * Validates and coerces a field value to the expected type
 */
function validateAndCoerceField(
  value: unknown,
  fieldDef: OutputFieldDefinition
): unknown {
  switch (fieldDef.type) {
    case 'string':
      return String(value);

    case 'number':
      const num = Number(value);
      return isNaN(num) ? 0 : num;

    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
      }
      return Boolean(value);

    case 'array':
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        // Try to parse as JSON array or split by comma
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [value];
        } catch {
          return value.split(',').map((s) => s.trim());
        }
      }
      return [value];

    case 'json':
      if (typeof value === 'object') return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return { raw: value };
        }
      }
      return value;

    default:
      return value;
  }
}

/**
 * Gets default value for a field type
 */
function getDefaultValue(type: OutputFieldDefinition['type']): unknown {
  switch (type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'json':
      return {};
    default:
      return null;
  }
}

/**
 * Maps extracted fields to target DMO fields using mapping configuration
 */
export function mapFieldsToTarget(
  extractedFields: ExtractedFields,
  mappings: OutputFieldMapping[]
): MappingResult {
  const mappedFields: ExtractedFields = {};
  const errors: string[] = [];

  for (const mapping of mappings) {
    const sourceValue = extractedFields[mapping.sourceField];

    if (sourceValue === undefined) {
      errors.push(`Source field not found: ${mapping.sourceField}`);
      continue;
    }

    try {
      const transformedValue = mapping.transform
        ? applyTransform(sourceValue, mapping.transform)
        : sourceValue;

      mappedFields[mapping.targetField] = transformedValue;
    } catch (error) {
      errors.push(
        `Transform failed for ${mapping.sourceField}: ${error}`
      );
    }
  }

  return {
    success: errors.length === 0,
    mappedFields,
    errors,
  };
}

/**
 * Applies a transform to a field value
 */
function applyTransform(value: unknown, transform: FieldTransform): unknown {
  switch (transform.type) {
    case 'stringify':
      return typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);

    case 'parse_json':
      if (typeof value === 'string') {
        return JSON.parse(value);
      }
      return value;

    case 'truncate':
      const maxLength = (transform.options?.maxLength as number) || 255;
      const str = String(value);
      return str.length > maxLength
        ? str.substring(0, maxLength - 3) + '...'
        : str;

    case 'uppercase':
      return String(value).toUpperCase();

    case 'lowercase':
      return String(value).toLowerCase();

    default:
      return value;
  }
}

/**
 * Generates default field mappings when not explicitly configured
 */
export function generateDefaultMappings(
  outputFields: OutputFieldDefinition[],
  targetDMO: string
): OutputFieldMapping[] {
  return outputFields.map((field) => ({
    sourceField: field.name,
    targetField: `${field.name}__c`, // Salesforce custom field convention
  }));
}

/**
 * Validates that all required output fields are present in the LLM response
 */
export function validateOutputCompleteness(
  output: Record<string, unknown>,
  fieldDefinitions: OutputFieldDefinition[]
): { complete: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  for (const fieldDef of fieldDefinitions) {
    if (fieldDef.required && output[fieldDef.name] === undefined) {
      missingFields.push(fieldDef.name);
    }
  }

  return {
    complete: missingFields.length === 0,
    missingFields,
  };
}
