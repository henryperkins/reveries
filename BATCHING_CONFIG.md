# Research Batching Configuration

The ComprehensiveResearchService now supports configurable batch processing to help manage API rate limits.

## Configuration

Set the batch size using environment variables:

```bash
# For development (Vite)
VITE_RESEARCH_BATCH_SIZE=2

# For production/Node.js
RESEARCH_BATCH_SIZE=2
```

## Batch Size Options

- `1` (default): Sequential processing - processes one section at a time
- `2-3`: Moderate parallelism - good balance for rate-limited APIs
- `4-5`: Higher parallelism - use only with higher API rate limits

## Benefits

1. **Prevents rate limiting**: By processing sections in smaller batches
2. **Configurable concurrency**: Adjust based on your API limits
3. **Automatic delays**: 1-second pause between batches
4. **Progress tracking**: Clear batch progress messages

## Example

With 5 research sections and batch size of 2:
- Batch 1: Sections 1-2 (parallel)
- 1 second pause
- Batch 2: Sections 3-4 (parallel)
- 1 second pause
- Batch 3: Section 5

This reduces peak API load from 5 concurrent requests to just 2.