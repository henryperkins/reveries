import { useCallback, useRef } from 'react';
import { TimeoutManager } from '@/utils/timeoutManager';
import { TIMEOUTS } from '@/constants';
import { ResearchStep, ResearchStepType } from '@/types';
import { parseToolMessage } from '@/utils/toolMessageParser';

export type ProgressState = 'idle' | 'analyzing' | 'routing' | 'researching' | 'evaluating' | 'synthesizing' | 'complete';

interface ProgressManagerConfig {
  onProgressUpdate: (phase: ProgressState, message?: string) => void;
  onStepUpdate: (step: ResearchStep) => void;
  onToolDetected?: (toolName: string, type: 'start' | 'complete') => void;
  isO3Model: boolean;
}

export function useProgressManager({ onProgressUpdate, onStepUpdate, onToolDetected, isO3Model }: ProgressManagerConfig) {
  const progressTimeoutMgr = useRef<TimeoutManager>(new TimeoutManager());
  const currentProgressRef = useRef<number>(0);

  const updateProgressState = useCallback((phase: ProgressState, message?: string) => {
    const progressMap = {
      'idle': 0,
      'analyzing': 15,
      'routing': 25,
      'researching': 40,
      'evaluating': 60,
      'synthesizing': 80,
      'complete': 100
    } as const;

    const stepTypeMap = {
      'analyzing': ResearchStepType.GENERATING_QUERIES,
      'routing': ResearchStepType.GENERATING_QUERIES,
      'researching': ResearchStepType.WEB_RESEARCH,
      'evaluating': ResearchStepType.REFLECTION,
      'synthesizing': ResearchStepType.SEARCHING_FINAL_ANSWER
    } as const;

    const titleMap = {
      'analyzing': 'Analyzing Query',
      'routing': 'Selecting Research Strategy',
      'researching': 'Conducting Web Research',
      'evaluating': 'Evaluating Research Quality',
      'synthesizing': 'Synthesizing Final Answer'
    } as const;

    const toolMap = {
      'analyzing': ['query_analysis', 'paradigm_classification'],
      'routing': ['paradigm_routing', 'strategy_selection'],
      'researching': ['web_search', 'google_search', 'bing_search', 'academic_search'],
      'evaluating': ['quality_evaluation', 'fact_verification', 'source_validation'],
      'synthesizing': ['synthesis_engine', 'content_compression', 'narrative_generation']
    } as const;

    const newProgress = progressMap[phase];
    currentProgressRef.current = newProgress;
    onProgressUpdate(phase, message);

    // Create new step for this phase (except idle and complete)
    if (phase !== 'idle' && phase !== 'complete' && stepTypeMap[phase]) {
      const newStep: ResearchStep = {
        id: crypto.randomUUID(),
        title: titleMap[phase],
        icon: () => null,
        content: message || `Starting ${phase} phase...`,
        timestamp: new Date().toISOString(),
        type: stepTypeMap[phase],
        sources: [],
        isSpinning: true,
        toolsUsed: [],
        recommendedTools: [...(toolMap[phase] || [])]
      };
      onStepUpdate(newStep);
    }
  }, [onProgressUpdate, onStepUpdate]);

  const getPhaseTimeoutMs = useCallback((phase: ProgressState) => {
    const multiplier = isO3Model ? 4 : 1;

    switch (phase) {
      case 'analyzing': return TIMEOUTS.PROGRESS_ANALYSIS * multiplier;
      case 'routing': return TIMEOUTS.PROGRESS_ROUTING * multiplier;
      case 'researching': return TIMEOUTS.PROGRESS_RESEARCH * multiplier;
      case 'evaluating': return TIMEOUTS.PROGRESS_EVALUATION * multiplier;
      case 'synthesizing': return TIMEOUTS.PROGRESS_SYNTHESIS * multiplier;
      default: return TIMEOUTS.PROGRESS_RESEARCH * multiplier;
    }
  }, [isO3Model]);

  const startProgressTimeout = useCallback((phase: ProgressState) => {
    const timeoutMs = getPhaseTimeoutMs(phase);

    progressTimeoutMgr.current.start(phase, timeoutMs, (attempt) => {
      console.warn(`Progress timeout in ${phase} phase, advancing (attempt ${attempt})`);

      const currentProgress = currentProgressRef.current;

      // Force advance to next phase based on current progress
      if (currentProgress < 25) updateProgressState('routing', `Timeout in ${phase}, continuing...`);
      else if (currentProgress < 40) updateProgressState('researching', `Timeout in ${phase}, continuing...`);
      else if (currentProgress < 60) updateProgressState('evaluating', `Timeout in ${phase}, continuing...`);
      else if (currentProgress < 80) updateProgressState('synthesizing', `Timeout in ${phase}, continuing...`);
      else updateProgressState('complete');
    });
  }, [getPhaseTimeoutMs, updateProgressState]);

  const resetProgressTimeout = useCallback((customTimeout?: number) => {
    const timeout = customTimeout || getPhaseTimeoutMs('researching');
    progressTimeoutMgr.current.reset(timeout, (attempt) =>
      console.warn(`Progress timeout, advancing (attempt ${attempt})`)
    );
  }, [getPhaseTimeoutMs]);

  const clearAllTimeouts = useCallback(() => {
    progressTimeoutMgr.current.clearAll();
  }, []);

  const handleProgressMessage = useCallback((message: string) => {
    // First check for tool messages
    const toolMessage = parseToolMessage(message);
    if (toolMessage && onToolDetected) {
      onToolDetected(toolMessage.toolName, toolMessage.type);
      // Reset timeout on tool activity
      resetProgressTimeout();
    }
    
    // Then handle progress state transitions
    if (message.includes('Query classified as:')) {
      updateProgressState('analyzing', message);
      startProgressTimeout('analyzing');
    } else if (message.includes('Routing to') && message.includes('paradigm')) {
      updateProgressState('routing', message);
      startProgressTimeout('routing');
    } else if (message.includes('search queries') || message.includes('Comprehensive research')) {
      updateProgressState('researching', message);
      startProgressTimeout('researching');
    } else if (message.includes('quality') || message.includes('evaluating') || message.includes('self-healing') ||
               message.includes('evaluation') || message.includes('Research evaluation') ||
               message.includes('completed, evaluating') || message.includes('enhance research quality')) {
      updateProgressState('evaluating', message);
      startProgressTimeout('evaluating');
    } else if (message.includes('Finalizing') || message.includes('synthesis') || message.includes('comprehensive answer')) {
      updateProgressState('synthesizing', message);
      startProgressTimeout('synthesizing');
    } else if (message.includes('O3 model') && message.includes('processing')) {
      console.log(`O3 reasoning in progress: ${message}`);
      resetProgressTimeout(TIMEOUTS.PROGRESS_RESEARCH * 8);
    } else if (!toolMessage) {
      // Only reset timeout if not a tool message
      resetProgressTimeout();
    }
  }, [updateProgressState, startProgressTimeout, resetProgressTimeout, onToolDetected]);

  return {
    updateProgressState,
    handleProgressMessage,
    clearAllTimeouts,
    currentProgress: () => currentProgressRef.current
  };
}
