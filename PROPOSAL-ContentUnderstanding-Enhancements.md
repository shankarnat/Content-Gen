# Content Understanding Studio Enhancement Proposal

## Executive Summary

This proposal outlines enhancements to transform Content Foundry into a comprehensive **Content Understanding Studio** inspired by Azure AI's document analysis capabilities. The goal is to add document-centric analysis features while maintaining the existing generative pipeline functionality.

---

## Current State Analysis

### Existing Strengths
- Multi-cloud DMO/UDMO data model
- LLM integration (OpenAI, Anthropic)
- Pipeline execution with batch processing
- Confidence scores and grounding sources (basic implementation)
- Safety flags and PII detection
- Agent-first experience (project2.html)

### Gaps Identified
Based on the Azure AI Content Understanding Studio reference:
1. No document upload/preview functionality
2. No prebuilt analyzer selection hierarchy
3. Limited field extraction visualization
4. No document region highlighting
5. No analyzer result panels with structured output

---

## Proposed Enhancements

### 1. Document Analyzer UI (New Page: `analyzer.html`)

Create a new dedicated analyzer experience matching the Azure pattern:

```
+------------------+------------------------+------------------+
|  Upload Panel    |   Document Preview     |  Fields Panel    |
|  - Drag & drop   |   - PDF/Image render   |  - Extracted     |
|  - File list     |   - Region highlights  |    fields list   |
|  - Thumbnails    |   - Page navigation    |  - Confidence    |
|                  |   - Zoom controls      |  - Grounding     |
+------------------+------------------------+------------------+
                   |    Run Analysis Button                    |
                   +------------------------------------------+
```

#### Key Components:

**Left Panel - Upload Zone**
- Drag & drop file upload area
- File thumbnail preview
- Support for PDF, images (PNG, JPG), documents
- "Browse for files" link
- File list with delete option

**Center Panel - Document Preview**
- Document rendering with PDF.js or image display
- Bounding box overlays for extracted fields
- Color-coded regions (like Azure's pink/green/yellow boxes)
- Page navigation (1 of N)
- Zoom controls (+/-)
- "Run analysis" button with auto-run toggle

**Right Panel - Fields & Results**
- **Fields Tab**: List of extracted fields with:
  - Field name with colored status indicator
  - Page reference (p.1, p.2)
  - Table icon for tabular data
  - Confidence percentage
  - Expand/collapse for field values
  - "Hide missing fields" toggle

- **Result Tab**: Raw JSON/structured output

---

### 2. Prebuilt Analyzer Selection Hierarchy

Add hierarchical analyzer selection matching Azure's pattern:

```
Document Type → Category → Specific Type
    ↓              ↓           ↓
 Document     Procurement    Invoice
 Image        Financial      Receipt
 Audio        Identity       Tax Form
 Video        Healthcare     ID Card
```

#### Implementation:

```javascript
const ANALYZER_HIERARCHY = {
  Document: {
    Procurement: ['Invoice', 'Receipt', 'Purchase Order'],
    Financial: ['Bank Statement', 'Tax Form W2', 'Tax Form 1099'],
    Identity: ['US Driver License', 'US Passport', 'ID Card'],
    Healthcare: ['Insurance Card', 'Medical Record', 'Prescription'],
    General: ['Contract', 'Letter', 'Form']
  },
  Image: {
    General: ['Photo Analysis', 'Screenshot', 'Diagram'],
    Document: ['Scanned Document', 'Whiteboard', 'Business Card']
  },
  Audio: {
    CallCenter: ['Support Call', 'Sales Call'],
    Meeting: ['Transcript', 'Summary']
  },
  Video: {
    Meeting: ['Recording Analysis'],
    Content: ['Video Summary', 'Scene Detection']
  }
};
```

---

### 3. Field Schema & Extraction Panel

Enhanced field display matching Azure's right panel:

#### Field List Item Structure:
```
[Status Dot] FieldName  [p.N] [Table Icon] [Confidence%]  [Expand]
             └── Extracted Value
```

#### Status Indicators:
- Green (filled): High confidence (>80%)
- Yellow (warning): Medium confidence (50-80%)
- Red (empty): Low confidence or missing (<50%)
- Blue (outlined): Optional field not found

#### Field Types Support:
- **String**: Text extraction with spans
- **Number**: Numeric values with formatting
- **Date**: Date parsing with normalization
- **Currency**: Amount with currency code
- **Address**: Structured address components
- **Table**: Row/column data with headers
- **Selection Mark**: Checkbox/radio detection

---

### 4. Confidence Score Visualization

Enhance existing confidence implementation:

```javascript
// Field-level confidence with visual indicators
{
  fieldName: "BillingAddress",
  value: "123 Bill St, Redmond WA, 98052",
  confidence: 0.604,  // 60.40%
  page: 1,
  boundingBox: [x1, y1, x2, y2],
  spans: [{offset: 234, length: 32}]
}
```

#### Visual Elements:
- Progress bar under each field
- Color gradient: Red → Yellow → Green
- Percentage display
- Hover tooltip with detailed metrics

---

### 5. Grounding Sources & Spans

Implement Azure's span-based grounding:

```javascript
// Span reference for extracted content
{
  field: "AmountDue",
  value: "$150.00",
  sources: [
    {
      type: "document",
      page: 1,
      boundingBox: {
        polygon: [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
      },
      span: {
        offset: 1542,
        length: 7
      }
    }
  ]
}
```

#### Interaction:
- Click field → highlight region in document
- Click region → scroll to field in panel
- Hover → temporary highlight

---

### 6. Token Usage Display

Add token context indicator (matching Azure's "Tokens: [Context 1,000]"):

```javascript
// Token tracking per analysis
{
  inputTokens: 850,
  outputTokens: 420,
  contextWindow: 1000,
  estimatedCost: "$0.0127"
}
```

---

## New Data Models

### Analyzer Definition
```typescript
interface Analyzer {
  id: string;
  name: string;
  type: 'prebuilt' | 'custom';
  baseAnalyzerId?: string;  // For custom analyzers
  category: string;
  subCategory: string;
  fieldSchema: FieldDefinition[];
  segmentationMode?: 'page' | 'section' | 'paragraph';
  addOns?: ('layout' | 'barcodes' | 'figures')[];
}
```

### Analysis Result
```typescript
interface AnalysisResult {
  analyzerId: string;
  contentType: string;
  pages: PageResult[];
  fields: ExtractedField[];
  tables?: TableResult[];
  confidence: {
    overall: number;
    byField: Record<string, number>;
  };
  processingTime: number;
  tokenUsage: TokenUsage;
}
```

### Extracted Field
```typescript
interface ExtractedField {
  name: string;
  value: any;
  valueType: 'string' | 'number' | 'date' | 'currency' | 'address' | 'array';
  confidence: number;
  page: number;
  boundingBox?: BoundingBox;
  spans?: Span[];
  generationMethod: 'extract' | 'classify' | 'generate';
}
```

---

## UI Mockup: Analyzer Page

```
+------------------------------------------------------------------------+
| Content Foundry  |  Content Understanding Studio      Home Discover Build |
+------------------------------------------------------------------------+
| <- Try prebuilt analyzer                                                |
+------------------------------------------------------------------------+
| [Document v] [Procurement v] [Invoice v]  Learn more about analyzers   |
+------------------------------------------------------------------------+
|                  |                              |  Fields    Result     |
|  [Upload Icon]   |  +----------------------+   |  Hide missing [Toggle] |
|                  |  |                      |   |                        |
|  Drag & drop     |  |   CONTOSO LTD.      |   |  * AmountDue    p.1    |
|  files here or   |  |                      |   |    [----------]        |
|  Browse for files|  |   INVOICE           |   |                        |
|                  |  |   [Highlighted      |   |  * BalanceForward p.1  |
|  +-------------+ |  |    regions with     |   |    [--------]          |
|  | Sample      | |  |    color coding]    |   |                        |
|  | invoice.pdf | |  |                      |   |  * BillingAddress p.1  |
|  +-------------+ |  |                      |   |    60.40%              |
|                  |  +----------------------+   |    123 Bill St...      |
|                  |                              |                        |
|                  |  [Run analysis] Auto-run [x] |  * CustomerName  p.1   |
|                  |                              |    72.20%              |
|                  |     < 1 of 1 >   [+][-]     |    Microsoft Finance   |
+------------------+------------------------------+------------------------+
|                                          Tokens: [Context 1,000]         |
+------------------------------------------------------------------------+
```

---

## Implementation Phases

### Phase 1: Core Analyzer UI (Week 1-2)
- [ ] Create `analyzer.html` with three-panel layout
- [ ] Implement file upload with drag-and-drop
- [ ] Add prebuilt analyzer dropdown hierarchy
- [ ] Basic document preview (images first)

### Phase 2: Field Extraction Display (Week 2-3)
- [ ] Fields panel with confidence indicators
- [ ] Status dot coloring based on confidence
- [ ] Field value display with type formatting
- [ ] Hide missing fields toggle

### Phase 3: Document Highlighting (Week 3-4)
- [ ] Integrate PDF.js for PDF rendering
- [ ] Implement bounding box overlay system
- [ ] Click-to-highlight interaction
- [ ] Color-coded field regions

### Phase 4: Advanced Features (Week 4-5)
- [ ] Custom analyzer builder
- [ ] Knowledge base training examples
- [ ] Categorization with routing
- [ ] Result export functionality

---

## API Endpoints (New)

```
POST /api/analyzer/analyze
  - Upload file and run analysis
  - Returns: AnalysisResult

GET /api/analyzer/prebuilt
  - List available prebuilt analyzers
  - Returns: Analyzer[]

POST /api/analyzer/custom
  - Create custom analyzer from base
  - Body: {baseAnalyzerId, fieldSchema, name}
  - Returns: Analyzer

GET /api/analyzer/:id/schema
  - Get field schema for analyzer
  - Returns: FieldDefinition[]
```

---

## Integration with Existing Features

### DMO Bridge
- Analysis results can populate DMO records
- Field mappings from analyzer output to DMO fields
- Enable pipeline triggers on analysis completion

### Agent Integration
- Agent can trigger document analysis
- Natural language field extraction queries
- "Analyze this invoice and extract the total"

### Pipeline Connection
- Use extracted fields as pipeline inputs
- Chain analysis → transformation → generation
- Batch document processing

---

## Technical Requirements

### Frontend Dependencies
- PDF.js for document rendering
- Canvas API for bounding box overlays
- FileReader API for uploads
- Intersection Observer for lazy loading

### Backend Dependencies
- Multer for file uploads
- Sharp for image processing
- pdf-parse for PDF text extraction
- Document AI SDK (Azure/Google) for advanced extraction

---

## Success Metrics

1. **Document Processing Time**: < 5 seconds for single page
2. **Field Extraction Accuracy**: > 85% for prebuilt analyzers
3. **UI Responsiveness**: < 100ms interaction latency
4. **User Adoption**: 50% of users try analyzer within first session

---

## Files to Create/Modify

### New Files
- `analyzer.html` - Main analyzer UI
- `src/services/analyzer/` - Analyzer service module
- `src/api/routes/analyzer.ts` - API endpoints
- `src/types/analyzer.ts` - TypeScript interfaces

### Modified Files
- `index.html` - Add navigation link to analyzer
- `project2.html` - Add analyzer integration option
- `src/app.ts` - Register new routes

---

## Next Steps

1. Review and approve this proposal
2. Create detailed technical design for Phase 1
3. Set up development environment with PDF.js
4. Begin implementation of `analyzer.html`

---

*Proposal Version: 1.0*
*Date: 2024-01-20*
*Author: Content Foundry Team*
