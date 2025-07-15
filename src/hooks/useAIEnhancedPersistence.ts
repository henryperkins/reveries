import { useCallback, useState, useEffect } from 'react';
import { ResearchStep } from '../types';
import { databaseService } from '../services/databaseService';
import { useEnhancedPersistence } from './useEnhancedPersistence';

interface AIInsight {
  type: string;
  content: string;
  confidence: number;
  relatedSteps?: string[];
}

interface AIEnhancedState {
  insights: AIInsight[];
  isGeneratingInsights: boolean;
  semanticSearchResults: ResearchStep[];
  isSearching: boolean;
}

export function useAIEnhancedPersistence(sessionId: string) {
  const basePersistence = useEnhancedPersistence(sessionId);
  const [aiState, setAIState] = useState<AIEnhancedState>({
    insights: [],
    isGeneratingInsights: false,
    semanticSearchResults: [],
    isSearching: false,
  });

  // Save research step with AI enhancement
  const saveResearchStepWithAI = useCallback(async (
    step: ResearchStep,
    parentId?: string
  ) => {
    // Save to localStorage first
    await basePersistence.saveResearchStep(step, parentId);

    // If connected to database with AI, use enhanced save
    if (basePersistence.persistenceState.isConnected) {
      try {
        await databaseService.saveResearchStepWithAI(sessionId, step, parentId);
      } catch (error) {
        console.error('AI-enhanced save failed:', error);
      }
    }
  }, [sessionId, basePersistence]);

  // Semantic search across research
  const semanticSearch = useCallback(async (query: string) => {
    if (!basePersistence.persistenceState.isConnected) {
      return [];
    }

    setAIState(prev => ({ ...prev, isSearching: true }));
    try {
      const results = await databaseService.semanticSearch(query, sessionId);
      setAIState(prev => ({
        ...prev,
        semanticSearchResults: results,
        isSearching: false
      }));
      return results;
    } catch (error) {
      console.error('Semantic search failed:', error);
      setAIState(prev => ({ ...prev, isSearching: false }));
      return [];
    }
  }, [sessionId, basePersistence.persistenceState.isConnected]);

  // Generate AI insights
  const generateInsights = useCallback(async () => {
    if (!basePersistence.persistenceState.isConnected) {
      return;
    }

    setAIState(prev => ({ ...prev, isGeneratingInsights: true }));
    try {
      const insights = await databaseService.generateInsights(sessionId);
      setAIState(prev => ({
        ...prev,
        insights,
        isGeneratingInsights: false
      }));
    } catch (error) {
      console.error('Insight generation failed:', error);
      setAIState(prev => ({ ...prev, isGeneratingInsights: false }));
    }
  }, [sessionId, basePersistence.persistenceState.isConnected]);

  // Get enhanced statistics
  const getEnhancedStats = useCallback(async () => {
    if (!basePersistence.persistenceState.isConnected) {
      return null;
    }

    try {
      return await databaseService.getEnhancedStatistics(sessionId);
    } catch (error) {
      console.error('Failed to get enhanced stats:', error);
      return null;
    }
  }, [sessionId, basePersistence.persistenceState.isConnected]);

  // Auto-generate insights when sufficient data is available
  useEffect(() => {
    const checkAndGenerateInsights = async () => {
      const data = await basePersistence.loadResearchData();
      if (data?.steps && data.steps.length >= 3 && aiState.insights.length === 0) {
        await generateInsights();
      }
    };

    if (basePersistence.persistenceState.isConnected) {
      checkAndGenerateInsights();
    }
  }, [
    basePersistence.persistenceState.isConnected,
    aiState.insights.length,
    generateInsights,
    basePersistence
  ]);

  return {
    ...basePersistence,
    aiState,
    saveResearchStepWithAI,
    semanticSearch,
    generateInsights,
    getEnhancedStats,
  };
}
