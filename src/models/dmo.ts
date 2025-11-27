/**
 * Data Model Object (DMO) - Represents a data entity in Data Cloud
 */

export interface DMOField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'text';
  required?: boolean;
  maxLength?: number;
  description?: string;
}

export interface DMOSchema {
  id: string;
  name: string;
  apiName: string; // e.g., 'Case__dlm', 'Account__dlm'
  icon?: string;
  fields: DMOField[];
  primaryKeyField: string;
  relationships?: DMORelationship[];
}

export interface DMORelationship {
  name: string;
  targetDMO: string; // API name of related DMO
  foreignKeyField: string; // Field in this DMO
  targetKeyField: string; // Field in target DMO
  type: 'lookup' | 'master-detail';
}

export interface DMORecord {
  [key: string]: unknown;
}

export interface DMODataSource {
  schema: DMOSchema;
  records: DMORecord[];
}

/**
 * Input configuration for a pipeline - specifies which DMOs to use
 */
export interface PipelineInputConfig {
  primaryDMO: string; // API name
  relatedDMOs?: RelatedDMOConfig[];
  filter?: DMOFilter;
}

export interface RelatedDMOConfig {
  apiName: string;
  relationship: string; // Relationship name to use
  fields?: string[]; // Specific fields to include (all if empty)
}

export interface DMOFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_null';
  value: unknown;
}

/**
 * Resolved record with all related data joined
 */
export interface ResolvedRecord {
  primary: DMORecord;
  related: {
    [dmoName: string]: DMORecord | null;
  };
}

/**
 * Sample DMO schemas for the demo
 */
export const SAMPLE_DMO_SCHEMAS: DMOSchema[] = [
  {
    id: 'case-dmo',
    name: 'Case',
    apiName: 'Case__dlm',
    icon: '📋',
    primaryKeyField: 'CaseId',
    fields: [
      { name: 'CaseId', type: 'string', required: true },
      { name: 'Subject', type: 'string', required: true, maxLength: 255 },
      { name: 'Description', type: 'text', required: false },
      { name: 'Priority', type: 'string', required: false },
      { name: 'Status', type: 'string', required: true },
      { name: 'AccountId', type: 'string', required: false },
      { name: 'ContactEmail', type: 'string', required: false },
    ],
    relationships: [
      {
        name: 'Account',
        targetDMO: 'Account__dlm',
        foreignKeyField: 'AccountId',
        targetKeyField: 'AccountId',
        type: 'lookup',
      },
      {
        name: 'Contact',
        targetDMO: 'Contact__dlm',
        foreignKeyField: 'ContactEmail',
        targetKeyField: 'Email',
        type: 'lookup',
      },
    ],
  },
  {
    id: 'account-dmo',
    name: 'Account',
    apiName: 'Account__dlm',
    icon: '🏢',
    primaryKeyField: 'AccountId',
    fields: [
      { name: 'AccountId', type: 'string', required: true },
      { name: 'Name', type: 'string', required: true },
      { name: 'Industry', type: 'string', required: false },
      { name: 'AnnualRevenue', type: 'string', required: false },
      { name: 'SupportTier', type: 'string', required: false },
      { name: 'CustomerSince', type: 'date', required: false },
    ],
  },
  {
    id: 'contact-dmo',
    name: 'Contact',
    apiName: 'Contact__dlm',
    icon: '👤',
    primaryKeyField: 'ContactId',
    fields: [
      { name: 'ContactId', type: 'string', required: true },
      { name: 'Email', type: 'string', required: true },
      { name: 'Name', type: 'string', required: true },
      { name: 'Title', type: 'string', required: false },
      { name: 'AccountId', type: 'string', required: false },
    ],
  },
];
