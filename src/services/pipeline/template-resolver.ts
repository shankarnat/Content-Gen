/**
 * Template Resolver - Resolves prompt template variables with actual data
 */

import { ResolvedRecord, DMORecord } from '../../models/dmo';
import { parseTemplateVariables, TemplateVariable } from '../../models/prompt-template';
import { logger } from '../../utils/logger';

export interface ResolveResult {
  resolvedPrompt: string;
  unresolvedVariables: TemplateVariable[];
  usedVariables: TemplateVariable[];
}

/**
 * Resolves template variables with data from DMO records
 */
export function resolveTemplate(
  template: string,
  record: ResolvedRecord
): ResolveResult {
  const variables = parseTemplateVariables(template);
  const unresolvedVariables: TemplateVariable[] = [];
  const usedVariables: TemplateVariable[] = [];

  let resolvedPrompt = template;

  for (const variable of variables) {
    const value = getValueForVariable(variable, record);

    if (value !== undefined && value !== null) {
      resolvedPrompt = resolvedPrompt.replace(
        variable.fullMatch,
        String(value)
      );
      usedVariables.push(variable);
    } else {
      unresolvedVariables.push(variable);
      logger.warn('Unresolved template variable', {
        variable: variable.fullMatch,
        dmo: variable.dmoName,
        field: variable.fieldName,
      });
      // Replace with empty string to avoid showing raw placeholder
      resolvedPrompt = resolvedPrompt.replace(variable.fullMatch, '');
    }
  }

  return {
    resolvedPrompt,
    unresolvedVariables,
    usedVariables,
  };
}

/**
 * Gets value for a template variable from the resolved record
 */
function getValueForVariable(
  variable: TemplateVariable,
  record: ResolvedRecord
): unknown {
  const { dmoName, fieldName } = variable;

  // Check primary record first (common case names like 'Case')
  if (matchesDMOName(dmoName, 'primary', record)) {
    return record.primary[fieldName];
  }

  // Check related records
  for (const [relatedName, relatedRecord] of Object.entries(record.related)) {
    if (relatedRecord && matchesDMOName(dmoName, relatedName, record)) {
      return relatedRecord[fieldName];
    }
  }

  return undefined;
}

/**
 * Checks if a variable DMO name matches a record key
 * Handles variations like 'Case' matching 'Case__dlm' or just 'Case'
 */
function matchesDMOName(
  variableName: string,
  recordKey: string,
  record: ResolvedRecord
): boolean {
  // Direct match
  if (variableName.toLowerCase() === recordKey.toLowerCase()) {
    return true;
  }

  // Match against API name suffix (e.g., 'Case' matches 'Case__dlm')
  if (recordKey.toLowerCase().startsWith(variableName.toLowerCase())) {
    return true;
  }

  // For primary record, try common names
  if (recordKey === 'primary') {
    // Check if variable name matches any key in the primary record
    // that might indicate the object type
    const primaryKeys = Object.keys(record.primary);
    const typeIndicators = primaryKeys.filter(
      (k) => k.toLowerCase().includes('id') || k.toLowerCase().includes('type')
    );

    // If variable is 'Case' and primary has 'CaseId', it matches
    for (const indicator of typeIndicators) {
      if (indicator.toLowerCase().startsWith(variableName.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Builds a ResolvedRecord from raw data
 */
export function buildResolvedRecord(
  primaryRecord: DMORecord,
  relatedRecords?: Record<string, DMORecord | null>
): ResolvedRecord {
  return {
    primary: primaryRecord,
    related: relatedRecords || {},
  };
}

/**
 * Validates that all required variables can be resolved
 */
export function validateTemplateVariables(
  template: string,
  availableDMOs: string[]
): { valid: boolean; missingDMOs: string[] } {
  const variables = parseTemplateVariables(template);
  const referencedDMOs = new Set(variables.map((v) => v.dmoName.toLowerCase()));
  const availableLower = new Set(
    availableDMOs.map((d) => d.toLowerCase().replace('__dlm', ''))
  );

  const missingDMOs: string[] = [];

  for (const dmo of referencedDMOs) {
    if (!availableLower.has(dmo.toLowerCase())) {
      missingDMOs.push(dmo);
    }
  }

  return {
    valid: missingDMOs.length === 0,
    missingDMOs,
  };
}
