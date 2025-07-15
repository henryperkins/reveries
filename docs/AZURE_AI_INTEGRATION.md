# Azure AI Integration Guide

## Features Enabled

1. **Vector Search**
   - Semantic search across all research content
   - Find similar research steps
   - Powered by pgvector and Azure OpenAI embeddings

2. **AI-Powered Insights**
   - Automatic content summarization
   - Similarity recommendations
   - Research pattern detection

3. **Azure OpenAI Integration**
   - Direct model access through PostgreSQL
   - Automatic embedding generation
   - Content analysis functions

## Setup Instructions

1. **Enable Extensions** in Azure PostgreSQL:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE EXTENSION IF NOT EXISTS azure_ai;
   CREATE EXTENSION IF NOT EXISTS azure_openai;
   ```

2. **Configure Environment Variables**:
   ```env
   AZURE_OPENAI_ENDPOINT=your-endpoint
   AZURE_OPENAI_API_KEY=your-key
   AZURE_OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
   AZURE_OPENAI_DEPLOYMENT=gpt-4
   ```

3. **Initialize Vector Store**:
   ```bash
   npm run db:init
   ```

## Usage Examples

### Find Similar Research
```typescript
const similar = await graphManager.findSimilarNodes(nodeId);
```

### Semantic Search
```typescript
const results = await researchAgentService.semanticSearch(query);
```

### Generate with Azure OpenAI
```typescript
const { text } = await researchAgentService.generateWithAzureOpenAI(prompt);
```

## Performance Tips

1. **Indexing**:
   ```sql
   CREATE INDEX ON research_embeddings USING ivfflat (embedding vector_cosine_ops)
   WITH (lists = 100);
   ```

2. **Batch Processing**:
   ```typescript
   // Batch store research steps
   await Promise.all(steps.map(step =>
     researchAgentService.storeResearchStep(step, sessionId)
   ));
   ```

3. **Caching**:
   - Embeddings are automatically cached in PostgreSQL
   - Reuse existing embeddings when possible
