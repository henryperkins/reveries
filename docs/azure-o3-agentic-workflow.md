# Azure O3 Agentic Workflow Implementation

## Overview

The Azure O3 model now supports a full agentic workflow with research tools, enabling it to perform complex multi-step research tasks with tool calling capabilities.

## Key Changes Made

### 1. ModelProviderService Enhancement

The `ModelProviderService` has been updated to use `generateResponseWithTools` instead of basic `generateResponse` when research tools are available:

```typescript
// Old implementation (no tools)
const azureResult = await azureService.generateResponse(prompt, effort);

// New implementation (with agentic tools)
const researchTools = azureService.getAvailableResearchTools();
if (researchTools && researchTools.length > 0) {
  const azureResult = await azureService.generateResponseWithTools(
    prompt,
    researchTools,
    effort,
    undefined, // paradigm (optional)
    undefined, // paradigmProbabilities (optional)
    5 // maxIterations
  );
}
```

### 2. Available Research Tools

The Azure O3 model now has access to the following research tools:

- **advanced_web_search**: Perform advanced web searches with filters
- **search_academic_sources**: Search academic papers and research
- **analyze_statistics**: Analyze statistical data and trends
- **verify_facts**: Fact-check information
- **format_citations**: Format citations properly
- **build_knowledge_graph**: Create knowledge graphs from information
- **generate_visualizations**: Create visual representations of data
- **local_content_search**: Search local knowledge base

### 3. Tool Execution Flow

1. Azure O3 analyzes the user prompt
2. Decides which tools to use based on the query
3. Executes tools with appropriate parameters
4. Processes tool results
5. Generates a comprehensive response with citations

## Usage Examples

### Basic Query (No Tools)
```typescript
const result = await modelProvider.generateText(
  'What is quantum computing?',
  AZURE_O3_MODEL,
  EffortType.LOW
);
```

### Research Query (With Tools)
```typescript
const result = await modelProvider.generateText(
  'Find the latest research on quantum computing from 2024',
  AZURE_O3_MODEL,
  EffortType.HIGH
);
// This will automatically use search tools and return sources
```

### Complex Multi-Step Research
```typescript
const result = await modelProvider.generateText(
  'Compare quantum computing approaches by IBM, Google, and Microsoft',
  AZURE_O3_MODEL,
  EffortType.HIGH
);
// This may use multiple tools and iterations
```

## Configuration

Ensure these environment variables are set:

```bash
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=o3-mini  # or your O3 deployment name
AZURE_OPENAI_API_VERSION=2025-04-01-preview
```

## Effort Levels

The effort level affects:
- **LOW**: Quick responses, minimal tool usage
- **MEDIUM**: Balanced approach, selective tool usage
- **HIGH**: Comprehensive research, multiple tools and iterations

## Paradigm Support

The Azure O3 model also supports paradigm-aware research:

- **Dolores**: Action-oriented, focuses on implementation
- **Teddy**: Comprehensive, considers all perspectives
- **Bernard**: Analytical, focuses on architecture and theory
- **Maeve**: Strategic, focuses on control and optimization

## Fallback Behavior

If Azure AI Agent Service (with Bing Search) is available, it will be used first for enhanced search capabilities. If not available or if it fails, the system falls back to Azure OpenAI with the research tools.

## Testing

Run the integration test to verify the setup:

```bash
npm run build
node test-azure-integration.js
```

## Troubleshooting

1. **No tools available**: Check that ResearchToolsService is properly initialized
2. **API errors**: Verify environment variables and API quotas
3. **Tool execution failures**: Check individual tool implementations
4. **Rate limits**: The service includes automatic retry with exponential backoff

## Performance Considerations

- Tool execution adds latency but provides better results
- Use appropriate effort levels for your use case
- Consider caching for repeated queries
- Monitor token usage with high effort levels

## Future Enhancements

- Streaming support with tools (`streamResponseWithTools`)
- Custom tool registration
- Tool execution analytics
- Enhanced citation formatting
- Paradigm-specific tool selection optimization