# Azure PostgreSQL AI Integration Guide

This guide covers setting up Azure PostgreSQL Flexible Server with AI extensions for enhanced research capabilities in Reveries.

## Prerequisites

- Azure PostgreSQL Flexible Server (v16+)
- Azure OpenAI Service subscription
- Azure CLI installed
- PostgreSQL client tools

## Azure PostgreSQL AI Extensions Setup

### 1. Enable Required Extensions

Connect to your Azure PostgreSQL instance:

```bash
psql "host=reveriesdb.postgres.database.azure.com port=5432 dbname=reveries user=hperkins sslmode=require"
```

Enable the AI extensions:

```sql
-- Enable vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable Azure AI integration
CREATE EXTENSION IF NOT EXISTS azure_ai;

-- Enable Azure OpenAI integration
CREATE EXTENSION IF NOT EXISTS azure_openai;
```

### 2. Configure Azure OpenAI Connection

Set up the connection to Azure OpenAI:

```sql
-- Configure Azure OpenAI endpoint
SELECT azure_ai.set_setting('azure_openai.endpoint', 'https://your-openai.openai.azure.com');
SELECT azure_ai.set_setting('azure_openai.key', 'your-api-key');
```

### 3. Create AI-Enhanced Functions

The application automatically creates these functions, but you can also create them manually:

```sql
-- Function for generating embeddings
CREATE OR REPLACE FUNCTION generate_embedding(input_text TEXT)
RETURNS vector(1536)
AS $$
BEGIN
  RETURN azure_openai.create_embeddings(
    deployment_name => 'text-embedding-ada-002',
    input => input_text
  );
END;
$$ LANGUAGE plpgsql;

-- Function for content summarization
CREATE OR REPLACE FUNCTION summarize_content(input_text TEXT)
RETURNS TEXT
AS $$
BEGIN
  RETURN azure_openai.create_chat_completion(
    deployment_name => 'gpt-4',
    messages => jsonb_build_array(
      jsonb_build_object(
        'role', 'system',
        'content', 'Summarize the following research content in 2-3 sentences.'
      ),
      jsonb_build_object(
        'role', 'user',
        'content', input_text
      )
    )
  );
END;
$$ LANGUAGE plpgsql;
```

## Environment Configuration

Add these variables to your `.env.local`:

```env
# Azure PostgreSQL
PGHOST=reveriesdb.postgres.database.azure.com
PGPORT=5432
PGDATABASE=reveries
PGUSER=hperkins
PGPASSWORD=your-password

# Azure OpenAI for Database AI
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
AZURE_OPENAI_DEPLOYMENT=gpt-4
```

## Features Enabled

### 1. Automatic Embeddings
- Every research step is automatically embedded using Azure OpenAI
- Enables semantic search across all research content

### 2. Content Summarization
- Automatic summarization of research steps
- Helps quickly understand research progress

### 3. Semantic Search
- Find similar research across sessions
- Uses vector similarity with pgvector
- Returns relevance scores

### 4. AI Insights
- Automatically generates insights from research
- Identifies patterns and relationships
- Provides recommendations

### 5. Enhanced Analytics
- Sentiment analysis
- Key concept extraction
- Research trend identification

## Performance Optimization

### 1. Index Configuration

```sql
-- Optimize vector search with IVFFlat
CREATE INDEX idx_embedding_ivfflat ON research_steps
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Analyze table for query optimization
ANALYZE research_steps;
```

### 2. Connection Pooling

The application uses connection pooling by default. Adjust in `databaseService.ts`:

```typescript
max: 20,  // Maximum pool size
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 5000,
```

### 3. Batch Operations

For bulk imports, use batch embedding generation:

```sql
-- Batch generate embeddings for existing data
UPDATE research_steps
SET embedding = generate_embedding(content)
WHERE embedding IS NULL
LIMIT 100;
```

## Cost Management

### 1. Monitor API Usage

```sql
-- Track embedding generation
SELECT COUNT(*) as total_embeddings,
       DATE(created_at) as date
FROM research_steps
WHERE embedding IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 2. Optimize Embedding Calls

- Cache embeddings in the database
- Only embed significant content changes
- Use batch operations when possible

### 3. Set Usage Limits

Configure rate limiting in your Azure OpenAI deployment:

```bash
az cognitiveservices account deployment update \
  --name your-openai \
  --resource-group your-rg \
  --deployment-name text-embedding-ada-002 \
  --model-version "2" \
  --capacity 10  # TPM limit
```

## Troubleshooting

### Extension Not Available

If AI extensions are not available:

1. Ensure you're using PostgreSQL 16+
2. Check your Azure PostgreSQL tier supports extensions
3. Contact Azure support to enable the extensions

### Embedding Generation Fails

Common issues:
- API key or endpoint misconfigured
- Rate limits exceeded
- Network connectivity issues

Debug with:

```sql
-- Test embedding generation
SELECT generate_embedding('test text');

-- Check error logs
SELECT * FROM azure_ai.error_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Performance Issues

1. Check index usage:
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM research_steps
ORDER BY embedding <=> '[...]'::vector
LIMIT 5;
```

2. Monitor slow queries:
```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%embedding%'
ORDER BY mean_exec_time DESC;
```

## Best Practices

1. **Security**
   - Store API keys in Azure Key Vault
   - Use managed identities when possible
   - Implement row-level security

2. **Performance**
   - Pre-generate embeddings during off-peak hours
   - Use appropriate vector dimensions
   - Implement caching strategies

3. **Cost Optimization**
   - Monitor token usage
   - Implement content filtering
   - Use appropriate models for each task

4. **Data Quality**
   - Validate embeddings before storage
   - Implement retry logic
   - Monitor embedding quality metrics
