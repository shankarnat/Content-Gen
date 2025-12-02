# Content Understanding Studio Enhancement Proposal
## Incremental Enhancement to project2.html

## Executive Summary

This proposal outlines **incremental enhancements** to `project2.html` to add document analysis capabilities inspired by Azure AI Content Understanding Studio. The approach preserves the existing agent-first experience, welcome page with quick options, and three-panel layout while adding file upload as an additional source type.

**Key Principle**: Enhance, don't replace. The existing flow is excellent - we're adding document understanding as a new capability.

---

## What We're Keeping (Unchanged)

### 1. Welcome Page with Quick Options
The agent panel's quick options remain exactly as-is:
- Case Summaries
- Knowledge Articles
- Email Responses
- Call Summaries
- Lead Enrichment

### 2. Three-Panel Layout
```
+------------------+------------------------+------------------+
|   Left Panel     |    Center Panel        |   Right Panel    |
|   (Sources)      |    (Output/Preview)    |   (Agent)        |
+------------------+------------------------+------------------+
```

### 3. Agent-First Experience
- Agent welcome with avatar
- Quick option cards
- Chat-based interaction
- Suggested prompts

### 4. Existing Data Sources
- Cases, Email Messages, Resolved Cases
- Voice Calls, Contacts, Opportunities
- All existing DMO integrations

---

## Proposed Enhancements

### 1. New Content Type: "Document Analysis"

Add to the existing `CONTENT_TYPES` object:

```javascript
'document-analysis': {
  id: 'document-analysis',
  name: 'Document Analysis',
  icon: '📄',
  desc: 'Extract fields from invoices, receipts, forms & more',
  sources: ['Uploaded Documents'],  // Special source type
  outputs: ['Extracted Fields', 'Confidence Scores', 'Document Preview'],
  udmo: 'Extracted Data',
  isAnalyzer: true,  // Flag to enable analyzer mode
  analyzerTypes: {
    'Procurement': ['Invoice', 'Receipt', 'Purchase Order'],
    'Financial': ['Bank Statement', 'Tax Form'],
    'Identity': ['Driver License', 'Passport', 'ID Card'],
    'Healthcare': ['Insurance Card', 'Prescription'],
    'General': ['Contract', 'Letter', 'Form']
  }
}
```

This appears as another quick option card in the agent welcome screen.

---

### 2. Enhanced Left Panel: File Upload Source

When "Document Analysis" is selected, the Sources panel transforms:

**Before (existing sources)**:
```
+---------------------------+
| Sources | Configuration   |
+---------------------------+
| Data Sources (3)      [+] |
|                           |
| 📁 Cases                  |
|    156 records        🗑️  |
|                           |
| 📧 Email Messages         |
|    89 records         🗑️  |
+---------------------------+
```

**After (with file upload)**:
```
+---------------------------+
| Sources | Configuration   |
+---------------------------+
| Analyzer Type             |
| [Procurement ▼]           |
| [Invoice ▼]               |
+---------------------------+
| Upload Document       [+] |
|                           |
| +---------------------+   |
| |   ☁️ Drag & drop    |   |
| |   files here or     |   |
| |   Browse for files  |   |
| +---------------------+   |
|                           |
| +---+ invoice.pdf     🗑️  |
| |   | 1 page              |
| +---+                     |
+---------------------------+
| ℹ️ Supported: PDF, PNG,   |
|    JPG, TIFF              |
+---------------------------+
```

**Implementation**: Add a new source type `uploaded-file` alongside existing DMO sources.

---

### 3. Enhanced Center Panel: Document Preview + Extracted Fields

When analyzing documents, the center panel shows two views via tabs:

**Tab Structure**:
```
| Document | Extracted Fields | Raw JSON |
```

**Document Tab** (new):
```
+----------------------------------------+
| Document Preview           [Auto-run ✓]|
+----------------------------------------+
|  +--------------------------------+    |
|  |                                |    |
|  |   CONTOSO LTD.                |    |
|  |                                |    |
|  |   [Highlighted regions        |    |
|  |    with bounding boxes]       |    |
|  |                                |    |
|  +--------------------------------+    |
|                                        |
|  [Run Analysis]     < 1 of 1 >  🔍+ 🔍-|
+----------------------------------------+
```

**Extracted Fields Tab** (new):
```
+----------------------------------------+
| Extracted Fields      Hide missing [✓] |
+----------------------------------------+
| ● AmountDue              p.1    92.5%  |
|   $150.00                        ▼     |
|----------------------------------------|
| ◐ BalanceForward         p.1    67.2%  |
|   $45.00                         ▼     |
|----------------------------------------|
| ● BillingAddress         p.1    60.4%  |
|   123 Bill St, Redmond WA        ▼     |
|----------------------------------------|
| ○ ShippingAddress        p.1     --    |
|   (not found)                    ▼     |
+----------------------------------------+
| Tokens: [Context 1,000]                |
+----------------------------------------+
```

**Status Indicators**:
- ● Green filled: High confidence (>80%)
- ◐ Yellow half: Medium confidence (50-80%)
- ○ Empty circle: Low/missing (<50%)

---

### 4. Agent Integration for Document Analysis

The agent guides users through document analysis:

**Agent Flow**:
```
🤖 "Hi there! I'm your Content Foundry assistant."

[📋 Case Summaries]
[📚 Knowledge Articles]
[✉️ Email Responses]
[📄 Document Analysis]  ← NEW
[📞 Call Summaries]
```

When user selects "Document Analysis":

```
User: [Clicks Document Analysis]

🤖 "Great choice! I can extract data from invoices, receipts,
    forms, and more. What type of document would you like
    to analyze?"

[📦 Invoice or Receipt]
[📋 Tax Form]
[🪪 ID Document]
[📝 General Document]
```

After upload:

```
🤖 "I've analyzed your invoice from Contoso Ltd. I found:

    ✓ 12 fields extracted
    ✓ 85% average confidence
    ✓ 2 fields need review

    Would you like me to:
    • Create a Case from this invoice
    • Generate a summary email
    • Export the extracted data"

[Create Case] [Email Summary] [Export JSON]
```

---

### 5. Field Confidence Display Component

Add a reusable component for showing extracted fields with confidence:

```javascript
// New component for extracted field display
function renderExtractedField(field) {
  var confidenceClass = field.confidence > 0.8 ? 'high' :
                        field.confidence > 0.5 ? 'medium' : 'low';
  var statusIcon = field.confidence > 0.8 ? '●' :
                   field.confidence > 0.5 ? '◐' : '○';

  return `
    <div class="extracted-field ${confidenceClass}">
      <div class="field-header">
        <span class="field-status">${statusIcon}</span>
        <span class="field-name">${field.name}</span>
        <span class="field-page">p.${field.page}</span>
        <span class="field-confidence">${(field.confidence * 100).toFixed(1)}%</span>
        <button class="field-expand">▼</button>
      </div>
      <div class="field-value">${field.value || '(not found)'}</div>
      <div class="confidence-bar">
        <div class="confidence-fill ${confidenceClass}"
             style="width: ${field.confidence * 100}%"></div>
      </div>
    </div>
  `;
}
```

---

### 6. New CSS Additions (Minimal)

Add these styles to the existing stylesheet:

```css
/* Document Analysis Enhancements */
.upload-zone {
  border: 2px dashed #d8d8d8;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
}
.upload-zone:hover { border-color: #0176d3; background: #f8fbfe; }
.upload-zone.dragover { border-color: #0176d3; background: #e8f4fc; }

.analyzer-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d8d8d8;
  border-radius: 6px;
  margin-bottom: 8px;
}

.file-thumbnail {
  width: 48px;
  height: 48px;
  background: #f3f3f3;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Extracted Fields */
.extracted-field {
  padding: 12px;
  border-bottom: 1px solid #e5e5e5;
}
.extracted-field:hover { background: #f8fbfe; }
.field-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.field-status { font-size: 10px; }
.field-status.high { color: #2e844a; }
.field-status.medium { color: #a96404; }
.field-status.low { color: #706e6b; }
.field-name { flex: 1; font-weight: 500; font-size: 13px; }
.field-page { font-size: 11px; color: #706e6b; }
.field-confidence { font-size: 12px; color: #706e6b; }
.field-value {
  font-size: 14px;
  color: #3e3e3c;
  margin-top: 4px;
  padding-left: 18px;
}
.confidence-bar {
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  margin-top: 8px;
  margin-left: 18px;
}
.confidence-fill { height: 100%; border-radius: 2px; }
.confidence-fill.high { background: #2e844a; }
.confidence-fill.medium { background: #a96404; }
.confidence-fill.low { background: #ea001e; }

/* Document Preview */
.document-preview {
  background: #f3f3f3;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}
.document-image {
  max-width: 100%;
  max-height: 500px;
  border: 1px solid #e5e5e5;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.preview-controls {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}
```

---

## Visual Mockup: Document Analysis Flow

### Step 1: Welcome Screen (Unchanged + New Option)
```
+------------------+------------------------+------------------+
| Sources          | Output Preview         | 🤖 Agentforce    |
| Configuration    |                        |                  |
+------------------+                        | Hi there!        |
|                  |    ✨                  |                  |
| Select content   |    No content          | [📋 Case Summ.]  |
| type to see      |    generated yet       | [📚 KB Articles] |
| sources          |                        | [✉️ Emails]      |
|                  |                        | [📄 Doc Analysis]| ← NEW
|                  |                        | [📞 Call Summ.]  |
+------------------+------------------------+------------------+
```

### Step 2: Document Analysis Selected
```
+------------------+------------------------+------------------+
| Sources | Config | Document | Fields | JSON| 🤖 Agentforce   |
+------------------+------------------------+------------------+
| Analyzer Type    |                        | What type of     |
| [Procurement ▼]  |    📄                  | document?        |
| [Invoice ▼]      |                        |                  |
|------------------|    Drop your           | [📦 Invoice]     |
| Upload Document  |    document here       | [📋 Tax Form]    |
|                  |                        | [🪪 ID Doc]      |
| +-------------+  |    or click to         | [📝 General]     |
| | ☁️ Drop    |  |    browse              |                  |
| |   here     |  |                        |                  |
| +-------------+  |                        |                  |
|                  |                        |                  |
+------------------+------------------------+------------------+
```

### Step 3: Document Uploaded & Analyzed
```
+------------------+------------------------+------------------+
| Sources | Config | Document | Fields | JSON| 🤖 Agentforce   |
+------------------+------------------------+------------------+
| Analyzer Type    | +--------------------+ | I found 12       |
| [Procurement ▼]  | |  CONTOSO LTD.     | | fields!          |
| [Invoice ▼]      | |                    | |                  |
|------------------|  |  INVOICE          | | ✓ 10 high conf.  |
| Uploaded (1)     | |  [highlighted     | | ◐ 2 need review  |
|                  | |   regions]        | |                  |
| +---+ invoice    | |                    | | Would you like   |
| |   | .pdf   🗑️ | +--------------------+ | to:              |
| +---+ 1 page     |                        |                  |
|                  | [Run Analysis] [Auto✓] | [Create Case]    |
| [+ Add File]     |     < 1/1 >    🔍+ 🔍- | [Export JSON]    |
+------------------+------------------------+------------------+
```

### Step 4: Fields Tab View
```
+------------------+------------------------+------------------+
| Sources | Config | Document | Fields | JSON| 🤖 Agentforce   |
+------------------+------------------------+------------------+
| Analyzer Type    | Hide missing [✓]       | The BillingAddr  |
| [Procurement ▼]  |                        | has 60% conf.    |
| [Invoice ▼]      | ● AmountDue    92.5%   | Want me to       |
|------------------|   $150.00              | verify it?       |
| Uploaded (1)     |------------------------| |                |
|                  | ● Vendor       88.2%   | [Yes, verify]    |
| +---+ invoice    |   Contoso Ltd.         | [Looks correct]  |
| |   | .pdf   🗑️ |------------------------|                  |
| +---+ 1 page     | ◐ BillingAddr  60.4%   |                  |
|                  |   123 Bill St...       |                  |
| [+ Add File]     |------------------------|                  |
|                  | ● InvoiceDate  95.1%   |                  |
|                  |   01/15/2024           |                  |
|                  |------------------------|                  |
|                  | Tokens: [1,000]        |                  |
+------------------+------------------------+------------------+
```

---

## Data Model Additions

### Extended CONTENT_TYPES
```javascript
var CONTENT_TYPES = {
  // ... existing types unchanged ...

  'document-analysis': {
    id: 'document-analysis',
    name: 'Document Analysis',
    icon: '📄',
    desc: 'Extract fields from invoices, receipts, forms & more',
    sources: ['Uploaded Documents'],
    outputs: ['Extracted Fields'],
    udmo: null,
    isAnalyzer: true
  }
};
```

### New Analyzer Configuration
```javascript
var ANALYZER_TYPES = {
  'Procurement': {
    name: 'Procurement',
    icon: '📦',
    subtypes: {
      'invoice': {
        name: 'Invoice',
        fields: ['VendorName', 'InvoiceNumber', 'InvoiceDate', 'DueDate',
                 'AmountDue', 'BillingAddress', 'LineItems', 'TotalAmount']
      },
      'receipt': {
        name: 'Receipt',
        fields: ['MerchantName', 'TransactionDate', 'Items', 'Subtotal',
                 'Tax', 'Total', 'PaymentMethod']
      },
      'purchase-order': {
        name: 'Purchase Order',
        fields: ['PONumber', 'Vendor', 'ShipTo', 'Items', 'Total']
      }
    }
  },
  'Financial': {
    name: 'Financial',
    icon: '💰',
    subtypes: {
      'bank-statement': { name: 'Bank Statement', fields: [...] },
      'tax-w2': { name: 'Tax Form W2', fields: [...] }
    }
  },
  // ... more categories
};
```

### Extracted Field Structure
```javascript
var SAMPLE_EXTRACTED_DATA = {
  'invoice-sample': {
    documentType: 'Invoice',
    confidence: 0.89,
    fields: [
      { name: 'VendorName', value: 'Contoso Ltd.', confidence: 0.95, page: 1 },
      { name: 'InvoiceNumber', value: 'INV-2024-001', confidence: 0.98, page: 1 },
      { name: 'AmountDue', value: '$150.00', confidence: 0.92, page: 1 },
      { name: 'BillingAddress', value: '123 Bill St, Redmond WA', confidence: 0.604, page: 1 },
      // ...
    ],
    tokenUsage: { context: 1000, input: 850, output: 420 }
  }
};
```

---

## State Management Updates

Extend existing state object:

```javascript
var state = {
  // Existing state (unchanged)
  currentView: 'welcome',
  selectedContentType: null,
  currentRecordIndex: 0,
  messages: [],
  isTyping: false,
  generatedData: null,
  activeOutputTab: 0,

  // New state for document analysis
  analyzerMode: {
    isActive: false,
    category: null,        // 'Procurement', 'Financial', etc.
    subtype: null,         // 'invoice', 'receipt', etc.
    uploadedFiles: [],     // [{name, size, dataUrl, thumbnail}]
    extractedFields: [],   // [{name, value, confidence, page}]
    currentFileIndex: 0,
    hideMissingFields: true,
    autoRun: true
  }
};
```

---

## Implementation Plan (Incremental)

### Phase 1: Add Document Analysis Option
- [ ] Add 'document-analysis' to CONTENT_TYPES
- [ ] Show new quick option card in agent panel
- [ ] Add analyzer type selection to Sources panel
- [ ] Basic file upload zone (no analysis yet)

### Phase 2: File Upload & Preview
- [ ] Implement drag-and-drop file upload
- [ ] Show file thumbnail in Sources panel
- [ ] Display document image in center panel
- [ ] Add "Document" tab to output tabs

### Phase 3: Field Extraction Display
- [ ] Add "Fields" tab with extracted fields list
- [ ] Implement confidence indicators (●◐○)
- [ ] Add confidence bars under each field
- [ ] Hide missing fields toggle

### Phase 4: Agent Integration
- [ ] Agent guides through document type selection
- [ ] Agent summarizes extraction results
- [ ] Suggested actions (Create Case, Export, etc.)
- [ ] Agent can answer questions about extracted data

---

## Files to Modify

### Modified Only
- `project2.html` - All changes in single file
  - Add new CSS styles (append to existing)
  - Add ANALYZER_TYPES data structure
  - Extend CONTENT_TYPES with 'document-analysis'
  - Add file upload rendering functions
  - Add extracted fields rendering functions
  - Extend state management
  - Update agent conversation flows

### No New Files Required
All changes contained within project2.html to maintain simplicity.

---

## Summary: What Changes vs. What Stays

| Component | Status | Notes |
|-----------|--------|-------|
| Welcome page | ✅ Unchanged | Add one new quick option |
| Quick options | ✅ Unchanged | Keep all 5 existing |
| Agent panel | ✅ Enhanced | New conversation flows for docs |
| Sources panel | ✅ Enhanced | Add file upload zone |
| Output tabs | ✅ Enhanced | Add Document & Fields tabs |
| Three-panel layout | ✅ Unchanged | Same structure |
| Existing content types | ✅ Unchanged | All work as before |
| DMO data sources | ✅ Unchanged | Still available |
| Chat interface | ✅ Unchanged | Same interaction model |

---

*Proposal Version: 2.0 (Incremental Approach)*
*Date: 2024-01-20*
*Author: Content Foundry Team*
