/**
 * Unified Research Context
 * A simple, secure container that flows through all research layers
 */

import { HostParadigm, ModelType, EffortType, Citation } from '@/types';

export interface LayerOutput {
  layerName: string;
  timestamp: number;
  data: any;
  status: 'pending' | 'completed' | 'failed';
}

export interface ResearchContext {
  // Core request info
  id: string;
  query: string;
  paradigm: HostParadigm;
  model: ModelType;
  effort: EffortType;
  startTime: number;
  
  // Layer outputs accumulator
  layers: Map<string, LayerOutput>;
  
  // Aggregated findings
  findings: {
    mainResearch?: string;
    isolatedTasks: Map<string, any>;
    selectedSources: Citation[];
    compressedContent?: string;
    memories: any[];
  };
  
  // Progress tracking
  pendingTasks: Set<string>;
  completedTasks: Set<string>;
  
  // Final synthesis (populated at end)
  synthesis?: string;
}

export class ResearchContextManager {
  private static instance: ResearchContextManager;
  
  private constructor() {}
  
  public static getInstance(): ResearchContextManager {
    if (!ResearchContextManager.instance) {
      ResearchContextManager.instance = new ResearchContextManager();
    }
    return ResearchContextManager.instance;
  }
  
  createContext(
    query: string,
    paradigm: HostParadigm,
    model: ModelType,
    effort: EffortType
  ): ResearchContext {
    return {
      id: `research-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      query,
      paradigm,
      model,
      effort,
      startTime: Date.now(),
      layers: new Map(),
      findings: {
        isolatedTasks: new Map(),
        selectedSources: [],
        memories: []
      },
      pendingTasks: new Set(),
      completedTasks: new Set()
    };
  }
  
  // Simple layer output recording
  recordLayerOutput(context: ResearchContext, layerName: string, data: any): void {
    context.layers.set(layerName, {
      layerName,
      timestamp: Date.now(),
      data,
      status: 'completed'
    });
  }
  
  // Track async task
  addPendingTask(context: ResearchContext, taskId: string): void {
    context.pendingTasks.add(taskId);
  }
  
  // Mark task complete and store result
  completeTask(context: ResearchContext, taskId: string, result: any): void {
    context.pendingTasks.delete(taskId);
    context.completedTasks.add(taskId);
    context.findings.isolatedTasks.set(taskId, result);
  }
  
  // Check if all tasks are complete
  allTasksComplete(context: ResearchContext): boolean {
    return context.pendingTasks.size === 0;
  }
  
  // Aggregate all findings for synthesis
  aggregateFindings(context: ResearchContext): string {
    const parts: string[] = [];
    
    // Main research
    if (context.findings.mainResearch) {
      parts.push('Main Research Findings:\n' + context.findings.mainResearch);
    }
    
    // Isolated task results
    if (context.findings.isolatedTasks.size > 0) {
      parts.push('\nFocused Analysis Results:');
      context.findings.isolatedTasks.forEach((result) => {
        if (result?.synthesis || result?.analysis) {
          parts.push(`- ${result.synthesis || result.analysis}`);
        }
      });
    }
    
    // Compressed insights
    if (context.findings.compressedContent) {
      parts.push('\nKey Insights:\n' + context.findings.compressedContent);
    }
    
    // Retrieved memories
    if (context.findings.memories.length > 0) {
      parts.push('\nRelevant Context from Memory:');
      context.findings.memories.forEach(memory => {
        if (memory?.content) {
          parts.push(`- ${memory.content}`);
        }
      });
    }
    
    return parts.join('\n\n');
  }
}