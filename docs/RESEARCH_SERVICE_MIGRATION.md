# ResearchAgentService Refactoring Migration Plan

## Overview
This document outlines the migration from the monolithic `researchAgentService.ts` (3000+ lines) to the new modular architecture.

## New Architecture

### Module Structure
```
src/services/
├── researchAgentService.ts (original - to be replaced)
├── researchAgentServiceRefactored.ts (new facade - 400 lines)
├── research/
│   ├── types.ts (100 lines)
│   ├── ResearchStrategyService.ts (400 lines) 
│   ├── WebResearchService.ts (300 lines)
│   ├── ComprehensiveResearchService.ts (400 lines)
│   └── EvaluationService.ts (350 lines)
├── providers/
│   └── ModelProviderService.ts (400 lines)
├── paradigm/
│   └── ParadigmResearchService.ts (600 lines)
├── memory/
│   └── ResearchMemoryService.ts (200 lines)
└── utils/
    └── ResearchUtilities.ts (200 lines)
```

## Migration Steps

### Phase 1: Test New Services (Day 1)
1. **Create test file**: `src/services/__tests__/researchAgentServiceMigration.test.ts`
2. **Test each new service independently**:
   ```typescript
   // Test model providers
   const modelProvider = ModelProviderService.getInstance();
   const result = await modelProvider.generateText(prompt, model, effort);
   
   // Test memory service
   const memoryService = ResearchMemoryService.getInstance();
   const cached = memoryService.getCachedResult(query);
   ```

3. **Compare outputs** between old and new services

### Phase 2: Feature Flag Implementation (Day 2)
1. **Add feature flag**:
   ```typescript
   // constants.ts
   export const USE_REFACTORED_RESEARCH = process.env.VITE_USE_REFACTORED_RESEARCH === 'true';
   ```

2. **Update imports conditionally**:
   ```typescript
   // App.tsx
   import { ResearchAgentService } from USE_REFACTORED_RESEARCH 
     ? './services/researchAgentServiceRefactored'
     : './services/researchAgentService';
   ```

### Phase 3: Gradual Rollout (Days 3-5)
1. **Start with read operations**:
   - getAvailableModels()
   - getMemoryStatistics()

2. **Move to simple operations**:
   - generateText()
   - generateSearchQueries()

3. **Finally migrate complex operations**:
   - performComprehensiveResearch()
   - routeResearchQuery()

### Phase 4: Update Dependencies (Days 6-7)
1. **Update all imports**:
   ```typescript
   // Before
   import { ResearchAgentService } from './services/researchAgentService';
   
   // After
   import { ResearchAgentService } from './services/researchAgentServiceRefactored';
   ```

2. **Update type imports**:
   ```typescript
   // Use new types location
   import { EnhancedResearchResults } from './services/research/types';
   ```

### Phase 5: Cleanup (Week 2)
1. **Remove old service file**
2. **Rename refactored service**:
   ```bash
   mv researchAgentServiceRefactored.ts researchAgentService.ts
   ```
3. **Remove feature flags**
4. **Update documentation**

## Testing Strategy

### Unit Tests
Each new service should have its own test file:
- `ModelProviderService.test.ts`
- `ResearchMemoryService.test.ts`
- `EvaluationService.test.ts`
- etc.

### Integration Tests
Test the main facade with all services:
```typescript
describe('ResearchAgentService Integration', () => {
  it('should handle factual queries', async () => {
    const service = ResearchAgentService.getInstance();
    const result = await service.routeResearchQuery(
      'What is the capital of France?',
      GENAI_MODEL_FLASH,
      EffortType.LOW
    );
    expect(result.queryType).toBe('factual');
  });
});
```

### Performance Tests
Compare performance metrics:
- Memory usage
- Response time
- Cache hit rates

## Rollback Plan

If issues arise:
1. **Immediate**: Toggle feature flag to false
2. **Quick fix**: Update imports to use old service
3. **Full rollback**: Restore from git backup

## Benefits Achieved

1. **Code Organization**:
   - No file exceeds 600 lines
   - Clear separation of concerns
   - Easy to navigate

2. **Testability**:
   - Each service can be tested in isolation
   - Mocking is straightforward
   - Better test coverage

3. **Maintainability**:
   - Changes are localized
   - Easier debugging
   - Clear dependency graph

4. **Team Collaboration**:
   - Multiple developers can work on different services
   - Reduced merge conflicts
   - Clear ownership boundaries

5. **Performance**:
   - Better caching strategies
   - Optimized imports
   - Lazy loading possibilities

## Monitoring

During migration, monitor:
- Error rates
- Response times
- Memory usage
- User feedback

## Success Criteria

Migration is complete when:
- [ ] All tests pass with new architecture
- [ ] Performance metrics are equal or better
- [ ] No increase in error rates
- [ ] Documentation is updated
- [ ] Team is trained on new structure
- [ ] Old service file is removed
