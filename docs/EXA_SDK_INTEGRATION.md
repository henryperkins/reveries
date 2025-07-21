# Exa SDK Integration

This document explains how to optionally use the official Exa TypeScript SDK for enhanced functionality and better type safety.

## Overview

The ExaSearchProvider supports two modes:

1. **Direct HTTP calls** (default) - Works out of the box, no additional dependencies
2. **Official Exa SDK** (optional) - Better type safety, error handling, and maintenance

## Installation

### Option 1: HTTP Mode (Default)
No additional installation required. The provider will automatically use direct HTTP calls to the Exa API.

### Option 2: SDK Mode (Recommended)
Install the official Exa TypeScript SDK:

```bash
npm install exa-js
# or
pnpm install exa-js
# or
yarn add exa-js
```

## Configuration

Add your Exa API key to your environment variables:

```bash
# .env or .env.local
VITE_EXA_API_KEY=your-exa-api-key
# or
EXA_API_KEY=your-exa-api-key
```

## Usage Examples

### Basic Search

```typescript
import { SearchProviderService } from '@/services/search/SearchProviderService';

const searchService = SearchProviderService.getInstance();

// Works with both HTTP and SDK modes
const results = await searchService.search('quantum computing research', {
  maxResults: 10,
  timeRange: 'month'
});

console.log(`Found ${results.results.length} results using ${results.provider}`);
```

### Async Research Tasks

```typescript
import { ResearchTaskService } from '@/services/research/ResearchTaskService';

const taskService = ResearchTaskService.getInstance();

// Submit long-running research
const taskId = await taskService.createStructuredResearch(
  "Comprehensive analysis of renewable energy trends 2020-2024",
  'timeline',
  {
    model: 'exa-research-pro',
    onProgress: (task) => {
      console.log(`Task status: ${task.status}`);
    }
  }
);

// Wait for completion
const completedTask = await taskService.waitForCompletion(taskId);
console.log('Research completed:', completedTask.data);
```

### Intelligent Research Routing

```typescript
import { WebResearchService } from '@/services/research/WebResearchService';

const webResearch = WebResearchService.getInstance();

// Automatically chooses sync vs async based on complexity
const result = await webResearch.performIntelligentResearch(
  "Compare different approaches to quantum error correction and their practical implications",
  'gemini-2.5-flash',
  'balanced',
  generateText,
  (progress) => console.log(progress)
);

if ('isAsync' in result) {
  console.log(`Complex query - running as background task: ${result.taskId}`);
} else {
  console.log('Simple query - immediate results available');
}
```

## Benefits of SDK Mode

When the official Exa SDK is installed, you get:

### 1. Better Type Safety
- Proper TypeScript interfaces for all API responses
- Compile-time validation of parameters
- IntelliSense support in your IDE

### 2. Enhanced Error Handling
- Standardized error messages and codes
- Better error recovery mechanisms
- Detailed error context

### 3. Automatic Features
- Built-in retry logic
- Rate limiting management  
- Response validation

### 4. Future-Proof
- Automatic updates with new API features
- Maintained by the Exa team
- Consistent with official documentation

## API Compatibility

All existing code continues to work regardless of which mode is used. The ExaSearchProvider automatically detects and uses the SDK when available, with seamless fallback to HTTP calls.

### Supported Features

| Feature | HTTP Mode | SDK Mode |
|---------|-----------|----------|
| Basic Search | ✅ | ✅ |
| Content Retrieval | ✅ | ✅ |
| Find Similar | ✅ | ✅ |
| Research Tasks | ✅ | ✅ |
| Task Polling | ✅ | ✅ (Enhanced) |
| Error Handling | ✅ | ✅ (Enhanced) |
| Type Safety | ⚠️ Basic | ✅ Full |

## Troubleshooting

### SDK Not Loading
If you see "Exa SDK not found, using direct HTTP calls" in the console:

1. Verify `exa-js` is installed: `npm list exa-js`
2. Check for import errors in browser console
3. Ensure your build tool supports dynamic imports

### API Key Issues
- Verify your API key is set in environment variables
- Check that the key is valid on the [Exa Dashboard](https://dashboard.exa.ai/api-keys)
- Ensure you're using the correct environment variable name

### Rate Limiting
Both modes respect Exa's rate limits:
- Free tier: Limited requests per day
- Pro tier: Higher limits
- Enterprise: Custom limits

## Migration Guide

### From HTTP-only to SDK
1. Install `exa-js`: `npm install exa-js`
2. Restart your development server
3. Check console logs for "Using official Exa SDK" message

### No Code Changes Required
The integration is designed to be transparent - all existing code continues to work without modifications.

## Performance Considerations

### SDK Mode
- Slightly larger bundle size (+~50KB)
- Better error handling and retries
- Optimized API calls

### HTTP Mode  
- Minimal bundle impact
- Direct control over requests
- Manual error handling

Choose based on your project's priorities: bundle size vs. enhanced features.