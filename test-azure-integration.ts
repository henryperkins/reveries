// Quick test to verify Azure O3 integration with agentic tools

import { ModelProviderService } from './src/services/providers/ModelProviderService';
import { AzureOpenAIService } from './src/services/azureOpenAIService';
import { AZURE_O3_MODEL, EffortType } from './src/types';

async function testAzureO3Integration() {
  console.log('Testing Azure O3 Integration...\n');

  // Check if Azure OpenAI is available
  const isAvailable = AzureOpenAIService.isAvailable();
  console.log('Azure OpenAI Service available:', isAvailable);

  if (!isAvailable) {
    console.log('Azure OpenAI is not configured. Please set the following environment variables:');
    console.log('- AZURE_OPENAI_ENDPOINT');
    console.log('- AZURE_OPENAI_API_KEY');
    console.log('- AZURE_OPENAI_DEPLOYMENT (optional, defaults to "o3")');
    return;
  }

  try {
    // Get Azure service instance to check available tools
    const azureService = AzureOpenAIService.getInstance();
    const availableTools = azureService.getAvailableResearchTools();
    
    console.log(`\nAvailable research tools: ${availableTools.length}`);
    availableTools.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.function.name}: ${tool.function.description}`);
    });

    // Test with ModelProviderService
    const modelProvider = ModelProviderService.getInstance();
    
    console.log('\n\nTesting basic query without tools...');
    const simpleResult = await modelProvider.generateText(
      'What is the capital of France?',
      AZURE_O3_MODEL,
      EffortType.LOW,
      (progress) => console.log(`  Progress: ${progress}`)
    );
    
    console.log('\nResult:', simpleResult.text.substring(0, 200));
    console.log('Sources:', simpleResult.sources?.length || 0);

    console.log('\n\nTesting research query that should use tools...');
    const researchResult = await modelProvider.generateText(
      'Find the latest research papers on quantum computing from 2024',
      AZURE_O3_MODEL,
      EffortType.HIGH,
      (progress) => console.log(`  Progress: ${progress}`)
    );
    
    console.log('\nResult:', researchResult.text.substring(0, 200));
    console.log('Sources found:', researchResult.sources?.length || 0);
    if (researchResult.sources && researchResult.sources.length > 0) {
      console.log('First source:', researchResult.sources[0]);
    }

    console.log('\n✅ Azure O3 integration test completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.statusCode) {
      console.error('HTTP status:', error.statusCode);
    }
  }
}

// Run the test
testAzureO3Integration().catch(console.error);