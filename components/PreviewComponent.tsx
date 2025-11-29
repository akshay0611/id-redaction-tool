'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { RedactedDocument, DetectionResult } from '@/types';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface PreviewComponentProps {
  document: RedactedDocument;
  detectionCount: {
    aadhaar: number;
    pan: number;
    phone: number;
    address: number;
  };
  onDownload: () => void;
  onReset: () => void;
}

export default function PreviewComponent({
  document,
  detectionCount,
  onDownload,
  onReset,
}: PreviewComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPDF = document.mimeType === 'application/pdf';

  const renderPDF = async () => {
    if (!canvasRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const loadingTask = pdfjsLib.getDocument(document.previewUrl);
      const pdf = await loadingTask.promise;
      setTotalPages(pdf.numPages);

      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Could not get canvas context');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering PDF:', err);
      setError('Failed to render PDF preview');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isPDF) {
      renderPDF();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document, currentPage, isPDF]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const totalDetections =
    detectionCount.aadhaar +
    detectionCount.pan +
    detectionCount.phone +
    detectionCount.address;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Detection Summary */}
      <div className="bg-black rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Detection Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-950/30 rounded-lg border border-blue-900/50">
            <div className="text-2xl font-bold text-blue-400">
              {detectionCount.aadhaar}
            </div>
            <div className="text-sm text-gray-400">Aadhaar Numbers</div>
          </div>
          <div className="text-center p-4 bg-green-950/30 rounded-lg border border-green-900/50">
            <div className="text-2xl font-bold text-green-400">
              {detectionCount.pan}
            </div>
            <div className="text-sm text-gray-400">PAN Numbers</div>
          </div>
          <div className="text-center p-4 bg-purple-950/30 rounded-lg border border-purple-900/50">
            <div className="text-2xl font-bold text-purple-400">
              {detectionCount.phone}
            </div>
            <div className="text-sm text-gray-400">Phone Numbers</div>
          </div>
          <div className="text-center p-4 bg-orange-950/30 rounded-lg border border-orange-900/50">
            <div className="text-2xl font-bold text-orange-400">
              {detectionCount.address}
            </div>
            <div className="text-sm text-gray-400">Addresses</div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-400">
            Total: <span className="font-semibold">{totalDetections}</span>{' '}
            sensitive item{totalDetections !== 1 ? 's' : ''} redacted
          </p>
        </div>
      </div>

      {/* Document Preview */}
      <div className="bg-black rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Redacted Document Preview</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="flex justify-center items-center bg-zinc-950 rounded-lg p-4 min-h-[400px]">
          {isLoading && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading preview...</p>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {isPDF ? (
                <canvas
                  ref={canvasRef}
                  className="max-w-full h-auto shadow-lg"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={document.previewUrl}
                  alt="Redacted document preview"
                  className="max-w-full h-auto shadow-lg rounded"
                />
              )}
            </>
          )}
        </div>

        {/* PDF Navigation Controls */}
        {isPDF && totalPages > 1 && !isLoading && (
          <div className="mt-4 flex items-center justify-center space-x-4">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
            >
              Previous
            </button>
            <span className="text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${currentPage === totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onDownload}
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
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
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span>Download Redacted Document</span>
        </button>
        <button
          onClick={onReset}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Upload New Document</span>
        </button>
      </div>
    </div>
  );
}
