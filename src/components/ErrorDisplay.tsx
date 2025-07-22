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
  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800/50 shadow-theme-md">
    <span className="shrink-0 mt-1 text-red-600 dark:text-red-400">
      <XMarkIcon className="w-5 h-5" />
    </span>

    <p className="flex-1 text-sm text-red-700 dark:text-red-300">{error}</p>

    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="shrink-0 p-2 -m-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 min-w-[44px] min-h-[44px] flex items-center justify-center focus-theme-ring"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    )}
  </div>
)

/* renamed to named export */
