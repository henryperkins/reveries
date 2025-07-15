# Database Setup Guide for Reveries

This guide covers setting up PostgreSQL with pgvector for both local development and Azure PostgreSQL Flexible Server deployment.

## Prerequisites

- Node.js 18+
- Docker (for local development)
- Azure CLI (for Azure deployment)
- PostgreSQL client tools

## Local Development Setup

### 1. Start PostgreSQL with Docker

```bash
# Start PostgreSQL container with pgvector
npm run db:start

# View logs
npm run db:logs

# Stop container
npm run db:stop
```

### 2. Initialize Database Schema

```bash
# Initialize schema
npm run db:init

# Initialize with sample data
npm run db:init -- --sample-data
```

### 3. Test Connection

```bash
npm run db:test
```

## Azure PostgreSQL Flexible Server Setup

### 1. Create Azure PostgreSQL Instance

```bash
# Using Azure CLI
az postgres flexible-server create \
  --name reveriesdb \
  --resource-group your-resource-group \
  --location eastus \
  --admin-user hperkins \
  --admin-password "YourSecurePassword" \
  --sku-name Standard_B2ms \
  --storage-size 32 \
  --version 16
```

### 2. Enable pgvector Extension

```bash
# Connect to Azure PostgreSQL
psql "host=reveriesdb.postgres.database.azure.com port=5432 dbname=postgres user=hperkins sslmode=require"

# Enable pgvector
CREATE EXTENSION vector;
```

### 3. Configure Environment Variables

Create `.env.local` file:

```env
# Azure PostgreSQL Configuration
PGHOST=reveriesdb.postgres.database.azure.com
PGPORT=5432
PGDATABASE=reveries
PGUSER=hperkins
PGPASSWORD=YourSecurePassword
```

### 4. Initialize Schema

```bash
# Test connection first
npm run db:test

# Initialize schema
npm run db:init
```

## Connection Strings

### Local Development
```
postgresql://postgres:postgres@localhost:5432/reveries
```

### Azure PostgreSQL
```
postgresql://hperkins:YourPassword@reveriesdb.postgres.database.azure.com:5432/reveries?sslmode=require
```

## Database Schema

### Tables

1. **research_sessions**
   - Stores research session metadata
   - Tracks creation and update times

2. **research_graphs**
   - Stores complete graph data as JSONB
   - Links to research sessions

3. **research_steps**
   - Individual research steps with content
   - Supports vector embeddings for similarity search
   - Hierarchical structure with parent_id

4. **research_sources**
   - Citation and source tracking
   - Links to research steps

### Indexes

- Session lookups: `idx_research_steps_session`
- Vector similarity: `idx_research_steps_embedding` (IVFFlat)
- Source lookups: `idx_research_sources_step`

## Performance Optimization

### For Azure PostgreSQL

1. **Enable Query Performance Insights**
   ```bash
   az postgres flexible-server parameter set \
     --name pgms_wait_sampling.query_capture_mode \
     --value ALL \
     --server-name reveriesdb \
     --resource-group your-resource-group
   ```

2. **Configure pgvector for Production**
   ```sql
   -- Adjust work_mem for vector operations
   ALTER SYSTEM SET work_mem = '256MB';

   -- Configure shared_buffers
   ALTER SYSTEM SET shared_buffers = '256MB';

   -- Reload configuration
   SELECT pg_reload_conf();
   ```

3. **Create Optimized Indexes**
   ```sql
   -- Create IVFFlat index with specific parameters
   CREATE INDEX idx_embedding_ivfflat ON research_steps
   USING ivfflat (embedding vector_cosine_ops)
   WITH (lists = 100);
   ```

## Backup and Recovery

### Local Backup
```bash
# Backup
docker exec reveries-postgres pg_dump -U postgres reveries > backup.sql

# Restore
docker exec -i reveries-postgres psql -U postgres reveries < backup.sql
```

### Azure Backup
```bash
# Enable automated backups
az postgres flexible-server update \
  --name reveriesdb \
  --resource-group your-resource-group \
  --backup-retention 7

# Manual backup
pg_dump "host=reveriesdb.postgres.database.azure.com port=5432 dbname=reveries user=hperkins sslmode=require" > backup.sql
```

## Monitoring

### Local Monitoring
```sql
-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor active connections
SELECT count(*) FROM pg_stat_activity;
```

### Azure Monitoring
- Use Azure Portal metrics
- Enable Query Performance Insights
- Set up alerts for connection limits

## Troubleshooting

### Connection Issues

1. **Local Docker**
   - Ensure Docker is running
   - Check port 5432 is not in use
   - Verify container health: `docker ps`

2. **Azure PostgreSQL**
   - Check firewall rules
   - Verify SSL requirements
   - Ensure connection string format

### Performance Issues

1. **Slow Vector Searches**
   - Increase `work_mem`
   - Rebuild IVFFlat indexes
   - Consider reducing embedding dimensions

2. **Connection Pool Exhaustion**
   - Increase `max` in pool configuration
   - Check for connection leaks
   - Monitor with `pg_stat_activity`

## Best Practices

1. **Security**
   - Use strong passwords
   - Enable SSL for Azure connections
   - Restrict firewall rules
   - Use connection pooling

2. **Performance**
   - Index frequently queried columns
   - Use JSONB for flexible schema
   - Implement connection pooling
   - Monitor query performance

3. **Data Management**
   - Regular backups
   - Archive old sessions
   - Implement data retention policies
   - Monitor storage usage
