'use client';

import { useReducer, useState } from 'react';
import UploadComponent from '@/components/UploadComponent';
import PreviewComponent from '@/components/PreviewComponent';
import ErrorDisplay from '@/components/ErrorDisplay';
import ProgressIndicator from '@/components/ProgressIndicator';
import { processingReducer } from '@/lib/stateReducer';
import { getOCRService } from '@/lib/ocrService';
import { getPatternDetector } from '@/lib/patternDetector';
import { getRedactionEngine } from '@/lib/redactionEngine';
import { getDownloadHandler } from '@/utils/downloadHandler';
import { FileError } from '@/types';

export default function Home() {
  // Initialize processing state with reducer
  const [processingState, dispatch] = useReducer(processingReducer, {
    status: 'idle',
  });

  // Track the original file
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  /**
   * Handle file upload and start the processing pipeline
   */
  const handleFileAccepted = async (file: File) => {
    setOriginalFile(file);
    
    try {
      // Start upload phase
      dispatch({ type: 'START_UPLOAD' });
      dispatch({ type: 'UPDATE_UPLOAD_PROGRESS', progress: 100 });

      // Start OCR extraction phase
      dispatch({ type: 'START_EXTRACTING' });
      const ocrService = getOCRService();
      const ocrResult = await ocrService.extractText(file);

      if (!ocrResult.success || ocrResult.error) {
        throw new Error(ocrResult.error || 'OCR extraction failed');
      }

      // Start pattern detection phase
      dispatch({ type: 'START_DETECTING' });
      const patternDetector = getPatternDetector();
      const detections = patternDetector.detectPII(ocrResult);

      // Start redaction phase
      dispatch({ type: 'START_REDACTING' });
      const redactionEngine = getRedactionEngine();
      const redactedDocument = await redactionEngine.applyRedactions(
        file,
        detections
      );

      // Complete - move to preview
      dispatch({
        type: 'COMPLETE',
        result: redactedDocument,
        detections,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      dispatch({ type: 'ERROR', error: errorMessage });
    }
  };

  /**
   * Handle file upload rejection
   */
  const handleFileRejected = (error: FileError) => {
    dispatch({ type: 'ERROR', error: error.message });
  };

  /**
   * Handle download of redacted document
   */
  const handleDownload = () => {
    if (processingState.status === 'complete' && originalFile) {
      const downloadHandler = getDownloadHandler();
      downloadHandler.downloadDocument(
        processingState.result,
        originalFile.name
      );
    }
  };

  /**
   * Handle reset to upload a new document
   */
  const handleReset = () => {
    // Clean up preview URL if it exists
    if (processingState.status === 'complete') {
      URL.revokeObjectURL(processingState.result.previewUrl);
    }
    
    setOriginalFile(null);
    dispatch({ type: 'RESET' });
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Document Redaction Tool
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Automatically detect and redact sensitive information from your documents
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Upload Section - Show when idle or error */}
          {(processingState.status === 'idle' ||
            processingState.status === 'error') && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <UploadComponent
                onFileAccepted={handleFileAccepted}
                onFileRejected={handleFileRejected}
              />
              
              {/* Error Display */}
              {processingState.status === 'error' && (
                <div className="mt-6">
                  <ErrorDisplay error={processingState.error} />
                </div>
              )}
            </div>
          )}

          {/* Processing Section - Show during processing */}
          <ProgressIndicator processingState={processingState} />

          {/* Preview Section - Show when complete */}
          {processingState.status === 'complete' && (
            <PreviewComponent
              document={processingState.result}
              detectionCount={{
                aadhaar: processingState.detections.aadhaarNumbers.length,
                pan: processingState.detections.panNumbers.length,
                phone: processingState.detections.phoneNumbers.length,
                address: processingState.detections.addresses.length,
              }}
              onDownload={handleDownload}
              onReset={handleReset}
            />
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            Your documents are processed locally in your browser. No data is
            sent to any server.
          </p>
        </div>
      </div>
    </main>
  );
}
