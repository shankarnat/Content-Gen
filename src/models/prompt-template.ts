/**
 * Prompt Template - Defines a reusable prompt with variable placeholders
 */

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string; // Template with {{DMO.Field}} placeholders
  outputFields: OutputFieldDefinition[];
  category?: string;
  tags?: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OutputFieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'json';
  description?: string;
  required?: boolean;
}

/**
 * Variable reference in a template - parsed from {{DMO.Field}} syntax
 */
export interface TemplateVariable {
  fullMatch: string; // e.g., '{{Case.Subject}}'
  dmoName: string; // e.g., 'Case'
  fieldName: string; // e.g., 'Subject'
}

/**
 * Parses template variables from a prompt template string
 */
export function parseTemplateVariables(template: string): TemplateVariable[] {
  const regex = /\{\{(\w+)\.(\w+)\}\}/g;
  const variables: TemplateVariable[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    variables.push({
      fullMatch: match[0],
      dmoName: match[1],
      fieldName: match[2],
    });
  }

  return variables;
}

/**
 * Gets unique DMO names referenced in a template
 */
export function getReferencedDMOs(template: string): string[] {
  const variables = parseTemplateVariables(template);
  const dmoNames = new Set(variables.map((v) => v.dmoName));
  return Array.from(dmoNames);
}

/**
 * Sample prompt templates for the demo
 */
export const SAMPLE_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'triage',
    name: 'Case Triage & Categorization',
    description: 'Analyze case content to extract category, sentiment, urgency, and recommended routing',
    category: 'Service',
    tags: ['triage', 'routing', 'sentiment'],
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    template: `Analyze the following support case and extract structured metadata.

**Case Subject:** {{Case.Subject}}
**Case Description:** {{Case.Description}}
**Account:** {{Account.Name}} ({{Account.SupportTier}} Support)
**Contact:** {{Contact.Name}}, {{Contact.Title}}

Extract the following:
1. Category (Billing, Technical, Feature Request, Complaint, General Inquiry)
2. Sentiment (Positive, Neutral, Negative, Angry)
3. Urgency Score (1-10)
4. Recommended Team (Billing, Engineering, Support L1, Support L2, Account Management)
5. Key Issues (list up to 3)
6. Suggested Response Tone

Respond in JSON format with these exact keys: Category, Sentiment, UrgencyScore, RecommendedTeam, KeyIssues, ResponseTone`,
    outputFields: [
      { name: 'Category', type: 'string', required: true },
      { name: 'Sentiment', type: 'string', required: true },
      { name: 'UrgencyScore', type: 'number', required: true },
      { name: 'RecommendedTeam', type: 'string', required: true },
      { name: 'KeyIssues', type: 'array', required: true },
      { name: 'ResponseTone', type: 'string', required: true },
    ],
  },
  {
    id: 'draft-response',
    name: 'Draft Response Email',
    description: 'Generate a personalized response email based on case context and account history',
    category: 'Service',
    tags: ['email', 'response', 'personalization'],
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    template: `Draft a professional response email for this support case.

**Case Subject:** {{Case.Subject}}
**Case Description:** {{Case.Description}}
**Account:** {{Account.Name}}
**Support Tier:** {{Account.SupportTier}}
**Customer Since:** {{Account.CustomerSince}}
**Contact:** {{Contact.Name}}, {{Contact.Title}}

Requirements:
- Address the customer by name
- Acknowledge their specific concern
- Provide a clear next step or resolution path
- Match tone to their sentiment (empathetic if frustrated)
- Reference their support tier benefits if relevant
- Keep it concise but thorough

Respond in JSON format with these exact keys: DraftEmail, SubjectLine, EstimatedResolutionTime`,
    outputFields: [
      { name: 'DraftEmail', type: 'string', required: true },
      { name: 'SubjectLine', type: 'string', required: true },
      { name: 'EstimatedResolutionTime', type: 'string', required: false },
    ],
  },
  {
    id: 'summarize',
    name: 'Case Summary',
    description: 'Generate a concise summary for internal handoff or escalation',
    category: 'Service',
    tags: ['summary', 'escalation', 'handoff'],
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    template: `Create a concise internal summary of this case for team handoff.

**Case:** {{Case.CaseId}}
**Subject:** {{Case.Subject}}
**Description:** {{Case.Description}}
**Account:** {{Account.Name}} ({{Account.Industry}}, {{Account.AnnualRevenue}} ARR)
**Support Tier:** {{Account.SupportTier}}

Provide:
1. One-line summary (max 100 chars)
2. Business impact assessment
3. Recommended priority (P1-P4)
4. Escalation needed? (Yes/No with reason)

Respond in JSON format with these exact keys: OneLiner, BusinessImpact, Priority, EscalationNeeded, EscalationReason`,
    outputFields: [
      { name: 'OneLiner', type: 'string', required: true },
      { name: 'BusinessImpact', type: 'string', required: true },
      { name: 'Priority', type: 'string', required: true },
      { name: 'EscalationNeeded', type: 'string', required: true },
      { name: 'EscalationReason', type: 'string', required: false },
    ],
  },
];
