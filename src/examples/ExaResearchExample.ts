/**
 * Example usage of the enhanced Exa Research integration
 * Demonstrates async research capabilities with structured outputs
 */

import { WebResearchService } from '../services/research/WebResearchService';
import { ResearchTaskService } from '../services/research/ResearchTaskService';
import { ModelType, EffortType } from '../types';

// Mock generateText function for example
const mockGenerateText = async (prompt: string, model: ModelType, effort: EffortType) => {
  return { text: "Mock response", sources: [] };
};

export class ExaResearchExample {
  private webResearch: WebResearchService;
  private taskService: ResearchTaskService;

  constructor() {
    this.webResearch = WebResearchService.getInstance();
    this.taskService = ResearchTaskService.getInstance();
  }

  /**
   * Example 1: Intelligent research routing
   * Automatically chooses sync vs async based on query complexity
   */
  async demonstrateIntelligentRouting() {
    console.log('\n🔍 Demonstrating Intelligent Research Routing\n');

    // Simple query -> sync research
    console.log('1. Simple query (sync):');
    const simpleQuery = "What is machine learning?";
    const simpleResult = await this.webResearch.performIntelligentResearch(
      simpleQuery,
      'gemini-2.5-flash',
      'balanced',
      mockGenerateText,
      (msg) => console.log(`  📋 ${msg}`)
    );

    if ('isAsync' in simpleResult) {
      console.log(`  🔄 Async task ID: ${simpleResult.taskId}`);
    } else {
      console.log(`  ✅ Sync result: ${simpleResult.aggregatedFindings.substring(0, 100)}...`);
    }

    // Complex query -> async research
    console.log('\n2. Complex query (async):');
    const complexQuery = "Provide a comprehensive analysis of quantum computing development from 2020-2024, comparing different approaches and their practical applications in cryptography and optimization";
    const complexResult = await this.webResearch.performIntelligentResearch(
      complexQuery,
      'gemini-2.5-flash', 
      'balanced',
      mockGenerateText,
      (msg) => console.log(`  📋 ${msg}`)
    );

    if ('isAsync' in complexResult) {
      console.log(`  🔄 Async task ID: ${complexResult.taskId}`);
      return complexResult.taskId;
    }
  }

  /**
   * Example 2: Structured research with predefined schemas
   */
  async demonstrateStructuredResearch() {
    console.log('\n📊 Demonstrating Structured Research\n');

    // Timeline research
    const timelineTaskId = await this.taskService.createStructuredResearch(
      "History and evolution of artificial intelligence from 1950 to 2024",
      'timeline',
      {
        model: 'exa-research-pro',
        onProgress: (task) => {
          console.log(`  Timeline task ${task.status}: ${task.id}`);
        }
      }
    );
    console.log(`Timeline research task: ${timelineTaskId}`);

    // Comparative research
    const comparativeTaskId = await this.taskService.createStructuredResearch(
      "Compare React, Vue, and Angular frameworks for enterprise applications",
      'comparative',
      {
        model: 'exa-research-pro'
      }
    );
    console.log(`Comparative research task: ${comparativeTaskId}`);

    // Technical research
    const technicalTaskId = await this.taskService.createStructuredResearch(
      "Technical specifications and implementation details of GraphQL federation",
      'technical'
    );
    console.log(`Technical research task: ${technicalTaskId}`);

    return [timelineTaskId, comparativeTaskId, technicalTaskId];
  }

  /**
   * Example 3: Task monitoring and results processing
   */
  async demonstrateTaskMonitoring(taskId: string) {
    console.log(`\n⏱️  Monitoring Research Task: ${taskId}\n`);

    try {
      // Get current status
      const task = await this.webResearch.getResearchTask(taskId);
      if (task) {
        console.log(`Current status: ${task.status}`);
        console.log(`Instructions: ${task.instructions}`);
      }

      // Wait for completion (with progress updates)
      const completedTask = await this.webResearch.waitForResearchCompletion(
        taskId,
        (task) => {
          console.log(`  📊 Progress: ${task.status} - ${task.id}`);
          if (task.status === 'completed') {
            console.log(`  🎉 Research completed!`);
          }
        },
        180000 // 3 minute timeout for example
      );

      // Convert to standard format
      const webResult = this.webResearch.convertTaskToWebResult(completedTask);
      console.log('\n📄 Research Results:');
      console.log(webResult.aggregatedFindings.substring(0, 500) + '...');
      console.log(`\n📚 Sources found: ${webResult.allSources.length}`);

      return webResult;
    } catch (error) {
      console.error('Task monitoring failed:', error);
      return null;
    }
  }

  /**
   * Example 4: Task management and cleanup
   */
  async demonstrateTaskManagement() {
    console.log('\n🗂️  Demonstrating Task Management\n');

    // List all tasks
    const allTasks = await this.webResearch.listResearchTasks();
    console.log(`Total research tasks: ${allTasks.length}`);
    
    allTasks.slice(0, 3).forEach(task => {
      console.log(`  Task ${task.id}: ${task.status} - "${task.instructions.substring(0, 50)}..."`);
    });

    // Show active task count
    const activeCount = this.taskService.getActiveTaskCount();
    console.log(`\nActive tasks: ${activeCount}`);

    // Cleanup old tasks
    this.taskService.cleanupTasks();
    console.log('✨ Cleanup completed');
  }

  /**
   * Run all examples
   */
  async runAllExamples() {
    console.log('🚀 Exa Research Integration Examples\n');
    console.log('=====================================');

    try {
      // Example 1: Intelligent routing
      const taskId = await this.demonstrateIntelligentRouting();

      // Example 2: Structured research
      const structuredTaskIds = await this.demonstrateStructuredResearch();

      // Example 3: Monitor a task (if we have one)
      if (taskId) {
        await this.demonstrateTaskMonitoring(taskId);
      }

      // Example 4: Task management
      await this.demonstrateTaskManagement();

      console.log('\n✅ All examples completed successfully!');
    } catch (error) {
      console.error('❌ Example execution failed:', error);
    }
  }
}

// Export for use in other modules
export const exaResearchExample = new ExaResearchExample();

// Usage example:
// import { exaResearchExample } from './examples/ExaResearchExample';
// await exaResearchExample.runAllExamples();