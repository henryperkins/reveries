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
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => (
  <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-red-50 to-red-100/60 border border-red-300 shadow">
    <span className="shrink-0 mt-1 text-red-600">
      <XMarkIcon className="w-5 h-5" />
    </span>

    <p className="flex-1 text-sm text-red-700">{error}</p>

    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="shrink-0 text-red-600 hover:text-red-800 transition-colors"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    )}
  </div>
)

export default ErrorDisplay
