'use client';

import { formatError } from '@/utils/errorMessages';

interface ErrorDisplayProps {
  error: string;
  onDismiss?: () => void;
}

/**
 * ErrorDisplay Component
 * Displays user-friendly error messages with actionable guidance
 */
export default function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  const errorConfig = formatError(error);

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start space-x-3">
        {/* Error Icon */}
        <svg
          className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>

        {/* Error Content */}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {errorConfig.title}
          </h3>
          <p className="mt-1 text-sm text-red-700">{errorConfig.message}</p>
          {errorConfig.actionable && (
            <p className="mt-2 text-xs text-red-600">
              <strong>Tip:</strong> {errorConfig.actionable}
            </p>
          )}
        </div>

        {/* Dismiss Button (optional) */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
            aria-label="Dismiss error"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
