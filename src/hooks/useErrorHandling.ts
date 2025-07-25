import { useState, useCallback } from 'react';
import { APIError } from '@/services/errorHandler';

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
