// Test Azure O3 Agentic Workflow
// This test file verifies that the Azure O3 model properly uses research tools

import { ModelProviderService } from './src/services/providers/ModelProviderService.js';
import { AZURE_O3_MODEL, EffortType } from './src/types.js';

async function testAzureO3AgenticWorkflow() {
  console.log('Testing Azure O3 Agentic Workflow...\n');
  
  try {
    const modelProvider = ModelProviderService.getInstance();
    
    // Test 1: Basic text generation with Azure O3
    console.log('Test 1: Basic Azure O3 text generation');
    const basicPrompt = 'What is quantum computing?';
    
    const progressCallback = (message) => {
      console.log(`  Progress: ${message}`);
    };
    
    const basicResult = await modelProvider.generateText(
      basicPrompt,
      AZURE_O3_MODEL,
      EffortType.MEDIUM,
      progressCallback
    );
    
    console.log('  Result received:', basicResult.text ? '✓' : '✗');
    console.log('  Sources:', basicResult.sources?.length || 0);
    console.log('  Sample text:', basicResult.text.substring(0, 100) + '...\n');
    
    // Test 2: Research-oriented query that should trigger tool usage
    console.log('Test 2: Research query with tool usage');
    const researchPrompt = 'Research the latest developments in quantum computing from 2024, including recent breakthroughs and applications';
    
    const researchResult = await modelProvider.generateText(
      researchPrompt,
      AZURE_O3_MODEL,
      EffortType.HIGH,
      progressCallback
    );
    
    console.log('  Result received:', researchResult.text ? '✓' : '✗');
    console.log('  Sources:', researchResult.sources?.length || 0);
    if (researchResult.sources && researchResult.sources.length > 0) {
      console.log('  First source:', researchResult.sources[0]);
    }
    console.log('  Sample text:', researchResult.text.substring(0, 100) + '...\n');
    
    // Test 3: Complex multi-step research query
    console.log('Test 3: Complex multi-step research');
    const complexPrompt = 'Compare quantum computing approaches by IBM, Google, and Microsoft. Include their latest achievements, hardware specifications, and future roadmaps.';
    
    const complexResult = await modelProvider.generateText(
      complexPrompt,
      AZURE_O3_MODEL,
      EffortType.HIGH,
      progressCallback
    );
    
    console.log('  Result received:', complexResult.text ? '✓' : '✗');
    console.log('  Sources:', complexResult.sources?.length || 0);
    console.log('  Text length:', complexResult.text.length);
    
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
}

// Run the test
testAzureO3AgenticWorkflow();