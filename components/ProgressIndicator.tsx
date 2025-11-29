'use client';

import { ProcessingState } from '@/types';

interface ProgressIndicatorProps {
  processingState: ProcessingState;
}

/**
 * ProgressIndicator Component
 * Shows loading spinner, current processing stage, and progress percentage
 */
export default function ProgressIndicator({
  processingState,
}: ProgressIndicatorProps) {
  // Only show for processing states
  if (
    processingState.status !== 'uploading' &&
    processingState.status !== 'extracting' &&
    processingState.status !== 'detecting' &&
    processingState.status !== 'redacting'
  ) {
    return null;
  }

  // Determine stage information
  const getStageInfo = () => {
    switch (processingState.status) {
      case 'uploading':
        return {
          title: 'Uploading document...',
          description: 'Preparing your document for processing',
          step: 1,
          totalSteps: 4,
        };
      case 'extracting':
        return {
          title: 'Extracting text from document...',
          description:
            processingState.totalPages && processingState.currentPage
              ? `Processing page ${processingState.currentPage} of ${processingState.totalPages}`
              : 'Using OCR to read text from your document',
          step: 2,
          totalSteps: 4,
        };
      case 'detecting':
        return {
          title: 'Detecting sensitive information...',
          description: 'Identifying Aadhaar, PAN, phone numbers, and addresses',
          step: 3,
          totalSteps: 4,
        };
      case 'redacting':
        return {
          title: 'Applying redactions...',
          description:
            processingState.totalPages && processingState.currentPage
              ? `Redacting page ${processingState.currentPage} of ${processingState.totalPages}`
              : 'Permanently obscuring sensitive information',
          step: 4,
          totalSteps: 4,
        };
      default:
        return {
          title: 'Processing...',
          description: 'Please wait',
          step: 1,
          totalSteps: 4,
        };
    }
  };

  const stageInfo = getStageInfo();
  const overallProgress = (stageInfo.step / stageInfo.totalSteps) * 100;

  // Calculate page progress for multi-page documents
  const getPageProgress = () => {
    if (processingState.status === 'extracting' || processingState.status === 'redacting') {
      if (processingState.currentPage && processingState.totalPages) {
        return (processingState.currentPage / processingState.totalPages) * 100;
      }
    }
    return null;
  };

  const pageProgress = getPageProgress();

  return (
    <div className="bg-black rounded-lg shadow-md p-8">
      <div className="text-center space-y-6">
        {/* Spinner */}
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        </div>

        {/* Status Text */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">
            {stageInfo.title}
          </h2>
          <p className="text-gray-300 text-sm">{stageInfo.description}</p>
        </div>

        {/* Stage Progress */}
        <div className="text-sm text-gray-400">
          Step {stageInfo.step} of {stageInfo.totalSteps}
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md mx-auto space-y-2">
          {/* Upload Progress Bar (specific to upload stage) */}
          {processingState.status === 'uploading' && (
            <>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${processingState.progress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400">
                {processingState.progress}% uploaded
              </div>
            </>
          )}

          {/* Page Progress Bar (for multi-page PDFs) */}
          {pageProgress !== null && (
            <>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${pageProgress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400">
                {Math.round(pageProgress)}% of current stage
              </div>
            </>
          )}

          {/* Overall Progress Bar (for other stages without page progress) */}
          {processingState.status !== 'uploading' && pageProgress === null && (
            <>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-400">
                {Math.round(overallProgress)}% complete
              </div>
            </>
          )}
        </div>

        {/* Stage Indicators */}
        <div className="flex justify-center items-center space-x-2 pt-4">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${step < stageInfo.step
                  ? 'bg-green-500'
                  : step === stageInfo.step
                    ? 'bg-blue-600'
                    : 'bg-gray-700'
                }`}
              title={
                step === 1
                  ? 'Upload'
                  : step === 2
                    ? 'Extract'
                    : step === 3
                      ? 'Detect'
                      : 'Redact'
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
