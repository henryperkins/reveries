# Database Service Migration

This directory and its DatabaseService.ts file have been deprecated.

## Migration Steps:

1. ✅ COMPLETED: All imports have been updated from `@/database/DatabaseService` to `@/services/databaseService`
2. ✅ COMPLETED: The main database service is now at `/src/services/databaseService.ts`
3. ✅ COMPLETED: For browser environments, stub redirects to adapter at `/src/services/databaseServiceAdapter.ts`
4. ✅ COMPLETED: Index export at `/src/services/index.ts` provides automatic environment detection

## Key Differences:

- The new service includes Azure AI integration (embeddings, summaries)
- Enhanced error handling with retry logic
- Better connection pooling
- Automatic schema initialization

## Deprecated Methods:

The following methods have different signatures:
- `createResearchSession` - Now uses simpler parameters
- `updateResearchSession` - Different update structure
- `addResearchStep` - Simplified, AI features handled internally
- `addGraphNode/Edge` - Consolidated into `saveResearchGraph`

Please update your code accordingly.
