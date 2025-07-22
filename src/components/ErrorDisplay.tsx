import React from 'react'
import { XMarkIcon } from './icons'

interface ErrorDisplayProps {
  error: string
  onDismiss?: () => void
}

/**
 * ErrorDisplay
 *
 * A lightweight, reusable component to present error messages
 * consistently across the application.  Uses Tailwind utility
 * classes to match the existing design language.
 *
 * Props
 * -----
 * • error (string)   - The error message to display.
 * • onDismiss ()     - Optional callback invoked when the
 *   dismiss/close icon is clicked.
 *
 * Example
 * -------
 * <ErrorDisplay error={error} onDismiss={() => setError(null)} />
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => (
  <div className="flex items-start gap-3 p-4 rounded-xl bg-semantic-error/10 border border-semantic-error/30 shadow-md">
    <span className="shrink-0 mt-1 text-semantic-error">
      <XMarkIcon className="w-5 h-5" />
    </span>

    <p className="flex-1 text-sm text-semantic-error">{error}</p>

    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="shrink-0 p-2 -m-2 text-semantic-error hover:text-semantic-error-light transition-colors rounded-lg hover:bg-semantic-error/10 min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center focus:ring-2 focus:ring-semantic-error/30"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    )}
  </div>
)

/* renamed to named export */
