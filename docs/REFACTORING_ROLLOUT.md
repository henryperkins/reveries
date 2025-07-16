# ResearchAgentService Refactoring - Rollout Instructions

## Quick Start

To enable the refactored ResearchAgentService:

1. **Add to your `.env.local` file**:
   ```env
   # Enable refactored research service
   VITE_USE_REFACTORED_RESEARCH=true
   ```

2. **Restart your development server**:
   ```bash
   npm run dev
   ```

3. **Monitor console logs**:
   You should see: `[ResearchAgentService] Using REFACTORED implementation`

## Testing the Migration

### Basic Smoke Test
1. Submit a simple query: "What is the capital of France?"
2. Verify you get results with Paris mentioned
3. Check that sources are displayed

### Query Type Tests
Test each query type to ensure proper routing:
- **Factual**: "What is DNA?"
- **Analytical**: "Analyze the impact of social media on democracy"
- **Comparative**: "Compare React vs Vue.js"
- **Exploratory**: "Tell me about machine learning"

### Advanced Features
- **Caching**: Submit the same query twice, second should be faster
- **Paradigm Detection**: Check the "Host Diagnostics" section for paradigm info
- **Error Handling**: Submit an empty query to test error handling

## Rollback Instructions

If you encounter issues:

1. **Immediate rollback** - Update `.env.local`:
   ```env
   VITE_USE_REFACTORED_RESEARCH=false
   # or remove the line entirely
   ```

2. **Restart the server**

## Performance Monitoring

The refactored service should have:
- ✅ Same or better response times
- ✅ Identical search results
- ✅ Proper source citations
- ✅ All UI features working

## Known Differences

The refactored service has:
- Better code organization (modular structure)
- Improved error messages
- Enhanced type safety
- Easier debugging with focused modules

## Troubleshooting

### Service not switching
- Clear browser cache
- Check console for feature flag status
- Ensure .env.local changes are saved

### Missing functionality
- Check browser console for errors
- Verify all sub-services are loaded
- File an issue with error details

## Module Structure

The refactored service is split into:
- `ModelProviderService` - AI model integrations
- `ResearchStrategyService` - Query routing logic
- `WebResearchService` - Search functionality
- `ComprehensiveResearchService` - Complex research
- `EvaluationService` - Quality assessment
- `ParadigmResearchService` - Host paradigm logic
- `ResearchMemoryService` - Caching system

Each module is < 600 lines for better maintainability.
