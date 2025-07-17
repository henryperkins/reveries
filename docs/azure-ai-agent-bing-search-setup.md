# Azure AI Agent Service with Bing Search Grounding Setup Guide

This guide explains how to configure Azure AI Agent Service with Bing Search grounding for enhanced web research capabilities in the application.

## Overview

The Azure AI Agent Service integration provides:
- **Real-time web search** through Bing Search grounding
- **Quality enhancement pipeline** using existing evaluation logic
- **Source reliability assessment** with confidence scoring
- **Automatic fallback** to traditional Azure OpenAI if needed
- **Integration** with the application's robust response enhancement system

## Prerequisites

1. **Azure AI Foundry Project** - Create a project in Azure AI Foundry portal
2. **Azure AI Agent Service** - Enable Agent Service in your project
3. **Bing Search Resource** - Create a Grounding with Bing Search resource
4. **API Keys and Endpoints** - Collect necessary credentials

## Step-by-Step Setup

### 1. Create Azure AI Foundry Project

```bash
# Using Azure CLI
az ai project create \
  --name "reveries-research-project" \
  --resource-group "your-resource-group" \
  --location "eastus2"
```

### 2. Create Bing Search Grounding Resource

1. Go to Azure AI Foundry portal
2. Navigate to your project
3. Go to **Settings** > **Connected Resources**
4. Click **+ New Connection**
5. Select **Grounding with Bing Search**
6. Configure the connection:
   - **Name**: `bing-search-grounding`
   - **Market**: `en-US`
   - **Safe Search**: `Moderate`

### 3. Environment Variables

Add these environment variables to your `.env` file:

```env
# Azure AI Agent Service Configuration
VITE_AZURE_AI_PROJECT_ENDPOINT=https://your-project.openai.azure.com/
VITE_AZURE_AI_AGENT_API_KEY=your-agent-api-key
VITE_BING_CONNECTION_ID=bing-search-grounding
VITE_AZURE_AI_API_VERSION=2025-05-01

# Optional: Fallback Azure OpenAI (existing)
VITE_AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
VITE_AZURE_OPENAI_API_KEY=your-openai-api-key
VITE_AZURE_OPENAI_DEPLOYMENT=o3
VITE_AZURE_OPENAI_API_VERSION=2025-04-01-preview
```

### 4. Production Environment Variables

For production deployment, set these as environment variables:

```bash
# Azure AI Agent Service
export AZURE_AI_PROJECT_ENDPOINT="https://your-project.openai.azure.com/"
export AZURE_AI_AGENT_API_KEY="your-agent-api-key"
export BING_CONNECTION_ID="bing-search-grounding"
export AZURE_AI_API_VERSION="2025-05-01"

# Fallback Azure OpenAI
export AZURE_OPENAI_ENDPOINT="https://your-openai.openai.azure.com/"
export AZURE_OPENAI_API_KEY="your-openai-api-key"
export AZURE_OPENAI_DEPLOYMENT="o3"
export AZURE_OPENAI_API_VERSION="2025-04-01-preview"
```

## Configuration Options

### Bing Search Parameters

The service can be configured with various Bing search parameters:

```typescript
// In azureAIAgentService.ts - BingGroundingTool configuration
{
  type: 'bing_grounding',
  bing_grounding: {
    connection_id: 'your-connection-id',
    count: 10,           // Number of search results (1-50)
    freshness: 'Week',   // Day, Week, Month, Year
    market: 'en-US',     // Market code
    safe_search: 'Moderate' // Off, Moderate, Strict
  }
}
```

### Quality Enhancement Settings

The service integrates with existing quality assessment:

```typescript
// Source quality indicators (automatically applied)
const qualityIndicators = {
  high: ['.gov', '.edu', 'wikipedia.org', 'nature.com', 'science.org'],
  medium: ['.org', 'medium.com', 'github.com'],
  low: ['.com', '.net']
};

// Confidence thresholds
const confidenceThresholds = {
  high: 0.8,     // High confidence responses
  medium: 0.6,   // Medium confidence responses
  low: 0.4       // Triggers self-healing if below
};
```

## Integration with Existing Enhancement Pipeline

### Automatic Quality Assessment

The Azure AI Agent Service automatically integrates with:

1. **ResearchUtilities.calculateConfidenceScore()** - Calculates confidence based on sources and content
2. **ResearchUtilities.needsSelfHealing()** - Determines if response needs improvement
3. **EvaluationService.attemptSelfHealing()** - Enhances low-quality responses
4. **Source quality evaluation** - Uses existing domain-based reliability scoring

### Enhancement Flow

```
User Query → Azure AI Agent → Bing Search → Quality Assessment → Enhancement Pipeline
     ↓                ↓              ↓              ↓                    ↓
Query Analysis → Agent Creation → Web Grounding → Source Evaluation → Final Response
```

### Fallback Strategy

1. **Azure AI Agent Service** with Bing Search (preferred)
2. **Traditional Azure OpenAI** (no web search)
3. **Gemini** with Google Search (final fallback)
4. **Grok** with live search (alternative fallback)

## Model Compatibility

Works with all Azure OpenAI models supported by Azure AI Foundry Agent Service:
- ✅ GPT-4o
- ✅ GPT-4.1
- ✅ O3 (when available)
- ❌ GPT-4o-mini (2024-07-18) - Not supported by Bing grounding

## Testing the Integration

### 1. Basic Functionality Test

```typescript
// Test if Azure AI Agent Service is available
const isAvailable = AzureAIAgentService.isAvailable();
console.log('Azure AI Agent Service available:', isAvailable);
```

### 2. Research Query Test

```typescript
// Test with a research query
const response = await azureAIAgent.generateEnhancedResponse(
  "What are the latest developments in quantum computing?",
  "azure-o3",
  EffortType.MEDIUM
);
console.log('Sources found:', response.sources.length);
console.log('Confidence:', response.confidence);
```

### 3. Enhancement Pipeline Test

```typescript
// Test integration with existing pipeline
const result = await researchAgent.processQuery(
  "Current trends in renewable energy technology",
  "azure-o3"
);
// Should use Azure AI Agent Service with Bing Search + enhancement pipeline
```

## Monitoring and Debugging

### Logging

The service provides detailed logging:

```typescript
// Logs to watch for
"Azure AI Agent Service with Bing Search grounding initialized"
"Using Azure AI Agent Service with Bing Search grounding and enhancement pipeline"
"Azure AI Agent returned X sources with quality enhancement"
"Azure AI Agent Service failed, falling back to Azure OpenAI"
```

### Error Handling

Common errors and solutions:

1. **CONFIG_ERROR** - Check environment variables
2. **AGENT_CREATION_ERROR** - Verify Azure AI project and permissions
3. **BING_CONNECTION_ERROR** - Confirm Bing Search resource connection
4. **RATE_LIMIT** - Implement rate limiting or upgrade tier
5. **POLLING_TIMEOUT** - Increase timeout for complex queries

## Cost Considerations

### Azure AI Agent Service Costs

- **Agent execution** - Per request pricing
- **Bing Search queries** - Per search operation
- **Token usage** - Input/output tokens for O3 model

### Optimization Strategies

1. **Cache frequent queries** using existing memory service
2. **Adjust search count** based on effort level
3. **Use appropriate freshness** settings (Week vs Day)
4. **Implement query deduplication** before Agent calls

## Security Considerations

1. **API Keys** - Store securely, rotate regularly
2. **Connection IDs** - Limit access to Bing Search resource
3. **Content filtering** - Safe search enabled by default
4. **Data handling** - No raw Bing content stored, only citations

## Troubleshooting

### Common Issues

1. **No sources returned**
   - Check Bing connection configuration
   - Verify search query clarity
   - Ensure safe search isn't blocking results

2. **Low confidence scores**
   - Review source quality indicators
   - Check if self-healing pipeline triggered
   - Verify evaluation metadata generation

3. **Fallback to traditional Azure OpenAI**
   - Confirm Azure AI Agent Service configuration
   - Check API key permissions
   - Verify Bing connection status

### Support Resources

- [Azure AI Foundry Documentation](https://learn.microsoft.com/en-us/azure/ai-foundry/)
- [Bing Search Grounding Guide](https://learn.microsoft.com/en-us/azure/ai-foundry/agents/how-to/tools/bing-grounding)
- [Azure AI Agent Service API Reference](https://learn.microsoft.com/en-us/azure/ai-foundry/agents/)

## Next Steps

1. **Set up the Azure resources** following this guide
2. **Configure environment variables** for your deployment
3. **Test the integration** with sample queries
4. **Monitor performance** and adjust parameters as needed
5. **Optimize costs** based on usage patterns

The Azure AI Agent Service with Bing Search provides powerful web research capabilities while maintaining the application's existing quality enhancement and evaluation systems.