// Simple test to verify suggestion functionality
import { ResearchMemoryService } from '../services/memory/ResearchMemoryService.js';
import { ResearchToolsService } from '../services/researchToolsService.js';

console.log('Testing suggestion services...');

try {
  // Test ResearchMemoryService
  const memoryService = ResearchMemoryService.getInstance();
  console.log('✓ ResearchMemoryService instantiated');

  const memorySuggestions = memoryService.getQuerySuggestions('artificial intelligence');
  console.log('✓ Memory suggestions retrieved:', memorySuggestions.length, 'suggestions');

  // Test ResearchToolsService
  const toolsService = ResearchToolsService.getInstance();
  console.log('✓ ResearchToolsService instantiated');

  const toolRecommendations = toolsService.recommendToolsForQuery('AI research', 'analytical');
  console.log('✓ Tool recommendations retrieved:', toolRecommendations.length, 'tools');
  console.log('Tools:', toolRecommendations);

  console.log('All services working correctly!');
} catch (error) {
  console.error('Error testing services:', error);
}
