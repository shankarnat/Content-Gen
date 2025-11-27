# Content Foundry

**Generative Data Pipeline for Data Cloud**

Content Foundry is a metadata-driven pipeline that transforms unstructured data into actionable content using LLM-powered generation.

## Features

- **Multi-Object Input**: Ingest from multiple related DMOs (Data Model Objects)
- **Prompt Templates**: Define reusable prompts with variable placeholders
- **LLM Integration**: Support for OpenAI and Anthropic models
- **Structured Output**: Extract and map generated content to DMO fields
- **Interactive Playground**: Test prompts and preview outputs before deployment

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key and/or Anthropic API key

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your API keys to .env
```

### Configuration

Edit `.env` with your settings:

```env
PORT=3001
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### Running

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

### Access

- **Playground UI**: http://localhost:3001
- **API**: http://localhost:3001/api

## API Endpoints

### Pipeline

- `POST /api/pipeline/execute` - Execute a test run
- `GET /api/pipeline/templates` - List prompt templates
- `GET /api/pipeline/templates/:id` - Get template details
- `GET /api/pipeline/models` - List available LLM models
- `POST /api/pipeline/estimate` - Estimate tokens and cost

### DMO

- `GET /api/dmo/schemas` - List DMO schemas
- `GET /api/dmo/:apiName/records` - Get DMO records
- `GET /api/dmo/:apiName/records/:id/related` - Get record with related data

## Architecture

```
src/
├── api/               # REST API layer
│   ├── routes/        # API route handlers
│   └── middleware/    # Express middleware
├── models/            # Domain models
│   ├── dmo.ts         # Data Model Objects
│   ├── prompt-template.ts
│   └── pipeline.ts
├── services/          # Business logic
│   ├── llm/           # LLM provider integrations
│   └── pipeline/      # Pipeline execution engine
└── utils/             # Utilities
```

## Sample Use Cases

### 1. Case Triage
Analyze support cases to extract:
- Category (Billing, Technical, etc.)
- Sentiment (Positive, Negative, Angry)
- Urgency Score (1-10)
- Recommended routing team

### 2. Draft Response
Generate personalized response emails:
- Address customer by name
- Reference account context
- Match appropriate tone

### 3. Case Summary
Create internal handoff summaries:
- One-line description
- Business impact assessment
- Priority recommendation
- Escalation decision

## License

ISC
