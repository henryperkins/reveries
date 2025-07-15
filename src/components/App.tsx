import { useState, useCallback } from 'react';
import { APIError } from '../services/errorHandler';
// Reuse the shared Paradigm UI dashboard component
import { ParadigmDashboard } from '../../components/ParadigmUI';
import type { HostParadigm, ParadigmProbabilities, EnhancedResearchResults, ContextLayer } from '../types';

export interface ErrorState {
  message: string;
  type: 'error' | 'warning' | 'info';
  action?: {
    label: string;
    handler: () => void;
  };
}

export function useErrorHandling() {
  const [error, setError] = useState<ErrorState | null>(null);

  const handleError = useCallback((error: Error) => {
    console.error('Error caught:', error);

    if (error instanceof APIError) {
      switch (error.code) {
        case 'RATE_LIMIT':
          setError({
            message: 'The AI service is currently overwhelmed. Please wait a moment before trying again.',
            type: 'warning',
            action: {
              label: 'Retry in 30s',
              handler: () => {
                setError(null);
                setTimeout(() => window.location.reload(), 30000);
              }
            }
          });
          break;

        case 'QUOTA_EXCEEDED':
          setError({
            message: 'Monthly quota reached for the primary AI model. Using fallback models.',
            type: 'info'
          });
          break;

        case 'NO_AVAILABLE_MODELS':
          setError({
            message: 'No AI models are currently available. Please check your API keys in the .env.local file.',
            type: 'error',
            action: {
              label: 'View Setup Guide',
              handler: () => window.open('/docs/setup.md', '_blank')
            }
          });
          break;

        case 'MAX_FALLBACKS_EXCEEDED':
          setError({
            message: 'All AI services are temporarily unavailable. This is unusual - please try again in a few minutes.',
            type: 'error'
          });
          break;

        default:
          setError({
            message: error.message || 'An unexpected error occurred.',
            type: 'error'
          });
      }
    } else {
      setError({
        message: 'An unexpected error occurred. Please refresh the page and try again.',
        type: 'error',
        action: {
          label: 'Refresh',
          handler: () => window.location.reload()
        }
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}

function App() {
  // ...existing code...

  // Add paradigm state
  const [paradigmInfo, setParadigmInfo] = useState<{
    paradigm?: HostParadigm;
    probabilities?: ParadigmProbabilities;
    metadata?: EnhancedResearchResults['adaptiveMetadata'];
    layers?: ContextLayer[];
    currentLayer?: ContextLayer;
  }>({});

  // ...existing code...

  const executeEnhancedResearchWorkflow = useCallback(
    async (query: string) => {
      // ...existing code...

      try {
        setIsProcessing(true);
        setError(null);

        // Create enhanced progress callback that captures layer info
        const enhancedOnProgress = (message: string, layer?: ContextLayer) => {
          if (layer) {
            setParadigmInfo(prev => ({ ...prev, currentLayer: layer }));
          }
          updateStepContent(currentStepId, message);
        };

        const result = await researchAgent.executeEnhancedQuery(
          query,
          enhancedOnProgress,
          selectedModel
        );

        // Extract and save paradigm data
        const { hostParadigm, adaptiveMetadata } = result;
        setParadigmInfo({
          paradigm: hostParadigm,
          probabilities: adaptiveMetadata?.paradigmProbabilities,
          metadata: adaptiveMetadata,
          layers: adaptiveMetadata?.contextLayers?.executed,
          currentLayer: adaptiveMetadata?.currentContextLayer
        });

        // ...existing code...
      } catch (err) {
        // ...existing code...
      } finally {
        // ...existing code...
      }
    },
    [currentStepId, updateStepContent, researchAgent, selectedModel, handleError, trackAnalytics]
  );

  // ...existing code...

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ...existing code... */}

      {/* Add ParadigmDashboard after the main content */}
      {paradigmInfo.paradigm && (
        <div className="mt-8">
          <ParadigmDashboard
            paradigm={paradigmInfo.paradigm}
            probabilities={paradigmInfo.probabilities}
            metadata={paradigmInfo.metadata}
            layers={paradigmInfo.layers}
            currentLayer={paradigmInfo.currentLayer}
          />
        </div>
      )}

      {/* ...existing code... */}
    </div>
  );
}
