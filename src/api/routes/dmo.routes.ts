/**
 * DMO (Data Model Object) API Routes
 */

import { Router, Request, Response } from 'express';
import { SAMPLE_DMO_SCHEMAS, DMORecord } from '../../models/dmo';
import { logger } from '../../utils/logger';

const router = Router();

// Sample data for demo purposes
const SAMPLE_RECORDS: Record<string, DMORecord[]> = {
  'Case__dlm': [
    {
      CaseId: 'CASE-001',
      Subject: 'Urgent: System outage affecting production',
      Description: 'Our production environment has been down for 2 hours. We are losing approximately $50,000 per hour in revenue. Multiple teams are blocked. We need immediate escalation to your engineering team. This is completely unacceptable for the premium support tier we are paying for. I expect a call back within 15 minutes.',
      Priority: 'High',
      Status: 'New',
      AccountId: 'ACC-1001',
      ContactEmail: 'john.smith@acmecorp.com',
    },
    {
      CaseId: 'CASE-002',
      Subject: 'Question about API rate limits',
      Description: 'Hi team, I was wondering if you could clarify the API rate limits for the Enterprise plan. We are planning to scale our integration and want to make sure we stay within bounds. Also, is there a way to request higher limits if needed? Thanks for your help!',
      Priority: 'Medium',
      Status: 'New',
      AccountId: 'ACC-1002',
      ContactEmail: 'sarah.jones@techstart.io',
    },
    {
      CaseId: 'CASE-003',
      Subject: 'Billing discrepancy on invoice #INV-2024-0892',
      Description: 'I noticed we were charged $2,400 instead of $1,800 on our latest invoice. Looking at our contract, we should be on the Growth plan at $150/user for 12 users. Can you please review and issue a credit for the difference? Attached is our signed contract for reference.',
      Priority: 'Medium',
      Status: 'New',
      AccountId: 'ACC-1003',
      ContactEmail: 'mike.chen@globallogistics.com',
    },
  ],
  'Account__dlm': [
    {
      AccountId: 'ACC-1001',
      Name: 'Acme Corporation',
      Industry: 'Manufacturing',
      AnnualRevenue: '$2.4B',
      SupportTier: 'Premium',
      CustomerSince: '2019-03-15',
    },
    {
      AccountId: 'ACC-1002',
      Name: 'TechStart Inc',
      Industry: 'Software',
      AnnualRevenue: '$180M',
      SupportTier: 'Standard',
      CustomerSince: '2022-08-01',
    },
    {
      AccountId: 'ACC-1003',
      Name: 'Global Logistics Partners',
      Industry: 'Transportation',
      AnnualRevenue: '$5.1B',
      SupportTier: 'Premium',
      CustomerSince: '2020-01-10',
    },
  ],
  'Contact__dlm': [
    {
      ContactId: 'CON-001',
      Email: 'john.smith@acmecorp.com',
      Name: 'John Smith',
      Title: 'VP of Engineering',
      AccountId: 'ACC-1001',
    },
    {
      ContactId: 'CON-002',
      Email: 'sarah.jones@techstart.io',
      Name: 'Sarah Jones',
      Title: 'Lead Developer',
      AccountId: 'ACC-1002',
    },
    {
      ContactId: 'CON-003',
      Email: 'mike.chen@globallogistics.com',
      Name: 'Mike Chen',
      Title: 'Finance Manager',
      AccountId: 'ACC-1003',
    },
  ],
};

/**
 * GET /api/dmo/schemas
 * Get all available DMO schemas
 */
router.get('/schemas', (_req: Request, res: Response) => {
  const schemas = SAMPLE_DMO_SCHEMAS.map((schema) => ({
    id: schema.id,
    name: schema.name,
    apiName: schema.apiName,
    icon: schema.icon,
    fields: schema.fields,
    primaryKeyField: schema.primaryKeyField,
    relationships: schema.relationships,
  }));

  res.json({ schemas });
});

/**
 * GET /api/dmo/schemas/:apiName
 * Get a specific DMO schema
 */
router.get('/schemas/:apiName', (req: Request, res: Response) => {
  const schema = SAMPLE_DMO_SCHEMAS.find(
    (s) => s.apiName === req.params.apiName
  );

  if (!schema) {
    return res.status(404).json({
      success: false,
      error: 'Schema not found',
    });
  }

  res.json({ schema });
});

/**
 * GET /api/dmo/:apiName/records
 * Get records for a DMO (with pagination)
 */
router.get('/:apiName/records', (req: Request, res: Response) => {
  const { apiName } = req.params;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  const records = SAMPLE_RECORDS[apiName];

  if (!records) {
    return res.status(404).json({
      success: false,
      error: 'DMO not found',
    });
  }

  const paginatedRecords = records.slice(offset, offset + limit);

  res.json({
    records: paginatedRecords,
    total: records.length,
    limit,
    offset,
    hasMore: offset + limit < records.length,
  });
});

/**
 * GET /api/dmo/:apiName/records/:id
 * Get a specific record by ID
 */
router.get('/:apiName/records/:id', (req: Request, res: Response) => {
  const { apiName, id } = req.params;

  const records = SAMPLE_RECORDS[apiName];

  if (!records) {
    return res.status(404).json({
      success: false,
      error: 'DMO not found',
    });
  }

  const schema = SAMPLE_DMO_SCHEMAS.find((s) => s.apiName === apiName);
  const primaryKeyField = schema?.primaryKeyField || 'id';

  const record = records.find((r) => r[primaryKeyField] === id);

  if (!record) {
    return res.status(404).json({
      success: false,
      error: 'Record not found',
    });
  }

  res.json({ record });
});

/**
 * GET /api/dmo/:apiName/records/:id/related
 * Get a record with all related records resolved
 */
router.get('/:apiName/records/:id/related', (req: Request, res: Response) => {
  const { apiName, id } = req.params;

  const records = SAMPLE_RECORDS[apiName];
  const schema = SAMPLE_DMO_SCHEMAS.find((s) => s.apiName === apiName);

  if (!records || !schema) {
    return res.status(404).json({
      success: false,
      error: 'DMO not found',
    });
  }

  const primaryKeyField = schema.primaryKeyField || 'id';
  const primaryRecord = records.find((r) => r[primaryKeyField] === id);

  if (!primaryRecord) {
    return res.status(404).json({
      success: false,
      error: 'Record not found',
    });
  }

  // Resolve related records
  const relatedRecords: Record<string, DMORecord | null> = {};

  if (schema.relationships) {
    for (const relationship of schema.relationships) {
      const foreignKeyValue = primaryRecord[relationship.foreignKeyField];
      const targetRecords = SAMPLE_RECORDS[relationship.targetDMO];

      if (targetRecords && foreignKeyValue) {
        const relatedRecord = targetRecords.find(
          (r) => r[relationship.targetKeyField] === foreignKeyValue
        );
        relatedRecords[relationship.name] = relatedRecord || null;
      } else {
        relatedRecords[relationship.name] = null;
      }
    }
  }

  res.json({
    primary: primaryRecord,
    related: relatedRecords,
  });
});

export default router;
