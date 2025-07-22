/**
 * Live integration test for Azure OpenAI paradigm-aware tool integration
 * This makes actual API calls to test the complete functionality
 */

import { AzureOpenAIService } from '@/services/azureOpenAIService';
import { ParadigmProbabilities, EffortType, HostParadigm } from '@/types';

async function testLiveIntegration() {
  console.log('🚀 Testing Live Azure OpenAI Integration...\n');

  const azureService = AzureOpenAIService.getInstance();
  
  // Test paradigm probabilities
  const bernardProbabilities: ParadigmProbabilities = {
    dolores: 0.1,
    teddy: 0.2,
    bernard: 0.6,
    maeve: 0.1
  };

  try {
    console.log('1. Testing paradigm-aware response generation...');
    
    const response = await azureService.generateResponseWithTools(
      'What are the key architectural principles in quantum computing research?',
      [], // No tools for this simple test
      EffortType.MEDIUM,
      'bernard',
      bernardProbabilities,
      2 // Max 2 iterations
    );

    console.log('✅ Response generated successfully!');
    console.log('📝 Response text:', response.text.substring(0, 200) + '...');
    console.log('🔢 Iterations:', response.iterationCount);
    console.log('🎭 Paradigm context:', response.paradigmContext?.paradigm);
    console.log('📊 Paradigm probabilities:', response.paradigmContext?.probabilities);
    
    if (response.reasoningContent) {
      console.log('🧠 Reasoning content available:', response.reasoningContent.length, 'characters');
    }

    console.log('\n2. Testing with tools...');
    
    const tools = azureService.getAvailableResearchTools().slice(0, 3); // Use first 3 tools
    console.log('🛠️  Using tools:', tools.map(t => t.function.name).join(', '));
    
    const toolResponse = await azureService.generateResponseWithTools(
      'Search for recent developments in quantum computing and provide a brief analysis',
      tools,
      EffortType.MEDIUM,
      'bernard',
      bernardProbabilities,
      3 // Max 3 iterations
    );

    console.log('✅ Tool-enhanced response generated!');
    console.log('📝 Response text:', toolResponse.text.substring(0, 200) + '...');
    console.log('🔢 Iterations:', toolResponse.iterationCount);
    console.log('🛠️  Tools used:', toolResponse.toolCalls?.map(t => t.name).join(', ') || 'None');
    
    console.log('\n3. Testing streaming response...');
    
    const chunks: string[] = [];
    const metadata: ({ paradigm?: HostParadigm } | undefined)[] = [];
    
    await new Promise<void>((resolve, reject) => {
      azureService.streamResponse(
        'Explain quantum entanglement in simple terms',
        EffortType.LOW,
        (chunk: string, meta?: { paradigm?: HostParadigm }) => {
          chunks.push(chunk);
          if (meta) metadata.push(meta);
          process.stdout.write(chunk); // Show streaming in real-time
        },
        () => {
          console.log('\n✅ Streaming completed!');
          console.log('📊 Total chunks:', chunks.length);
          console.log('🎭 Paradigm metadata:', metadata.length > 0 ? metadata[0] : 'None');
          resolve();
        },
        (error) => {
          console.error('❌ Streaming error:', error);
          reject(error);
        },
        'bernard',
        bernardProbabilities
      );
    });

    console.log('\n🎉 All live tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Live test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.message.includes('Rate limit') || error.message.includes('429')) {
        console.log('ℹ️  Rate limit hit - this is expected behavior');
      }
    }
  }
}

// Run the test
testLiveIntegration().catch(console.error);