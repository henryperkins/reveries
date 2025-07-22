/**
 * Research Task Service
 * Manages asynchronous research tasks using Exa's research API
 */

import { Citation } from '@/types';
import { ExaResearchTask, ExaResearchTaskList } from '../search/SearchProviderService';

export interface ResearchTaskOptions {
  model?: 'exa-research' | 'exa-research-pro';
  outputSchema?: Record<string, unknown>;
  inferSchema?: boolean;
  timeoutMs?: number;
  onProgress?: (task: ExaResearchTask) => void;
}

export interface StructuredResearchOutput {
  keyFindings: string[];
  mainTopics: string[];
  sources: Citation[];
  confidenceScore: number;
  gaps: string[];
  recommendations?: string[];
  timeline?: Array<{
    period: string;
    events: string[];
  }>;
}

export class ResearchTaskService {
  private static instance: ResearchTaskService;
  private activeTasks: Map<string, ExaResearchTask> = new Map();
  private taskCallbacks: Map<string, ((task: ExaResearchTask) => void)[]> = new Map();

  private constructor() {}

  public static getInstance(): ResearchTaskService {
    if (!ResearchTaskService.instance) {
      ResearchTaskService.instance = new ResearchTaskService();
    }
    return ResearchTaskService.instance;
  }

  /**
   * Submit a long-running research task
   */
  async submitResearchTask(
    instructions: string,
    options: ResearchTaskOptions = {}
  ): Promise<string> {
    const { SearchProviderService } = await import('../search/SearchProviderService');
    const searchService = SearchProviderService.getInstance();

    // Check if Exa is available
    const testResults = await searchService.testProviders();
    const exaProvider = testResults.find(result => result.provider === 'exa' && result.available);
    
    if (!exaProvider) {
      throw new Error('Exa research API not available. Please check your EXA_API_KEY configuration.');
    }

    // Get the Exa provider instance
    const providers = (searchService as any).providers;
    const exa = providers.find((p: any) => p.name === 'exa');
    
    if (!exa) {
      throw new Error('Exa provider not found in search service');
    }

    // Create the research task
    const taskId = await exa.createResearchTask(instructions, {
      model: options.model,
      outputSchema: options.outputSchema,
      inferSchema: options.inferSchema
    });

    // Track the task
    const initialTask: ExaResearchTask = {
      id: taskId,
      status: 'running',
      instructions,
      schema: options.outputSchema
    };

    this.activeTasks.set(taskId, initialTask);

    // Start background polling if callback provided
    if (options.onProgress) {
      this.startPolling(taskId, exa, options);
    }

    return taskId;
  }

  /**
   * Get task status and results
   */
  async getTask(taskId: string): Promise<ExaResearchTask | null> {
    // Check local cache first
    if (this.activeTasks.has(taskId)) {
      const { SearchProviderService } = await import('../search/SearchProviderService');
      const searchService = SearchProviderService.getInstance();
      const providers = (searchService as any).providers;
      const exa = providers.find((p: any) => p.name === 'exa');
      
      if (exa) {
        try {
          const task = await exa.getResearchTask(taskId);
          this.activeTasks.set(taskId, task);
          
          // Notify callbacks
          const callbacks = this.taskCallbacks.get(taskId) || [];
          callbacks.forEach(callback => callback(task));
          
          return task;
        } catch (error) {
          console.error(`Failed to get task ${taskId}:`, error);
          return this.activeTasks.get(taskId) || null;
        }
      }
    }

    return this.activeTasks.get(taskId) || null;
  }

  /**
   * Wait for task completion
   */
  async waitForCompletion(
    taskId: string,
    options: { timeoutMs?: number; onProgress?: (task: ExaResearchTask) => void } = {}
  ): Promise<ExaResearchTask> {
    const { SearchProviderService } = await import('../search/SearchProviderService');
    const searchService = SearchProviderService.getInstance();
    const providers = (searchService as any).providers;
    const exa = providers.find((p: any) => p.name === 'exa');
    
    if (!exa) {
      throw new Error('Exa provider not available');
    }

    return await exa.pollResearchTask(taskId, {
      timeoutMs: options.timeoutMs || 300000,
      onProgress: (task: ExaResearchTask) => {
        this.activeTasks.set(taskId, task);
        if (options.onProgress) {
          options.onProgress(task);
        }
        
        // Notify other callbacks
        const callbacks = this.taskCallbacks.get(taskId) || [];
        callbacks.forEach(callback => callback(task));
      }
    });
  }

  /**
   * List all research tasks
   */
  async listTasks(options?: { cursor?: string; limit?: number }): Promise<ExaResearchTaskList> {
    const { SearchProviderService } = await import('../search/SearchProviderService');
    const searchService = SearchProviderService.getInstance();
    const providers = (searchService as any).providers;
    const exa = providers.find((p: any) => p.name === 'exa');
    
    if (!exa) {
      throw new Error('Exa provider not available');
    }

    const result = await exa.listResearchTasks(options);
    
    // Update local cache
    result.data.forEach((task: any) => {
      this.activeTasks.set(task.id, task);
    });

    return result;
  }

  /**
   * Subscribe to task updates
   */
  subscribeToTask(taskId: string, callback: (task: ExaResearchTask) => void): () => void {
    if (!this.taskCallbacks.has(taskId)) {
      this.taskCallbacks.set(taskId, []);
    }
    
    this.taskCallbacks.get(taskId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.taskCallbacks.get(taskId) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Create structured research with predefined schema
   */
  async createStructuredResearch(
    instructions: string,
    researchType: 'general' | 'timeline' | 'comparative' | 'technical' = 'general',
    options: ResearchTaskOptions = {}
  ): Promise<string> {
    const schemas = {
      general: {
        type: 'object',
        properties: {
          keyFindings: {
            type: 'array',
            items: { type: 'string' },
            description: 'Main findings and insights'
          },
          mainTopics: {
            type: 'array', 
            items: { type: 'string' },
            description: 'Key topics covered'
          },
          confidenceScore: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Confidence in findings (0-1)'
          },
          gaps: {
            type: 'array',
            items: { type: 'string' },
            description: 'Information gaps or limitations'
          },
          recommendations: {
            type: 'array',
            items: { type: 'string' },
            description: 'Recommendations for further research'
          }
        }
      },
      timeline: {
        type: 'object',
        properties: {
          timeline: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                period: { type: 'string' },
                events: { 
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          },
          keyMilestones: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      comparative: {
        type: 'object',
        properties: {
          comparison: {
            type: 'object',
            properties: {
              similarities: { 
                type: 'array',
                items: { type: 'string' }
              },
              differences: {
                type: 'array', 
                items: { type: 'string' }
              },
              advantages: {
                type: 'object',
                additionalProperties: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      },
      technical: {
        type: 'object',
        properties: {
          technicalDetails: {
            type: 'array',
            items: { type: 'string' }
          },
          specifications: {
            type: 'object',
            additionalProperties: { type: 'string' }
          },
          limitations: {
            type: 'array',
            items: { type: 'string' }
          },
          applications: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    };

    return this.submitResearchTask(instructions, {
      ...options,
      outputSchema: schemas[researchType],
      model: options.model || 'exa-research-pro' // Use pro for structured output
    });
  }

  /**
   * Start background polling for a task
   */
  private startPolling(
    taskId: string, 
    exaProvider: any, 
    options: ResearchTaskOptions
  ): void {
    // Don't start multiple polling instances
    if (this.taskCallbacks.has(taskId)) {
      return;
    }

    const poll = async () => {
      try {
        const task = await exaProvider.getResearchTask(taskId);
        this.activeTasks.set(taskId, task);

        if (options.onProgress) {
          options.onProgress(task);
        }

        if (task.status === 'completed' || task.status === 'failed') {
          // Stop polling
          this.taskCallbacks.delete(taskId);
          return;
        }

        // Continue polling
        setTimeout(poll, 3000);
      } catch (error) {
        console.error(`Polling failed for task ${taskId}:`, error);
        setTimeout(poll, 5000); // Retry with longer delay
      }
    };

    // Mark as having callbacks to prevent multiple polling
    this.taskCallbacks.set(taskId, []);
    
    // Start polling
    setTimeout(poll, 1000);
  }

  /**
   * Clean up completed or failed tasks from cache
   */
  cleanupTasks(): void {
    for (const [taskId, task] of this.activeTasks.entries()) {
      if (task.status === 'completed' || task.status === 'failed') {
        // Keep completed tasks for 1 hour, failed for 30 minutes
        const keepDuration = task.status === 'completed' ? 3600000 : 1800000;
        const completedAt = task.completedAt ? new Date(task.completedAt).getTime() : Date.now();
        
        if (Date.now() - completedAt > keepDuration) {
          this.activeTasks.delete(taskId);
          this.taskCallbacks.delete(taskId);
        }
      }
    }
  }

  /**
   * Get active task count
   */
  getActiveTaskCount(): number {
    let count = 0;
    for (const task of this.activeTasks.values()) {
      if (task.status === 'running') {
        count++;
      }
    }
    return count;
  }
}