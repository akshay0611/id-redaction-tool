'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileError } from '@/types';

interface UploadComponentProps {
  onFileAccepted: (file: File) => void;
  onFileRejected: (error: FileError) => void;
}

export default function UploadComponent({
  onFileAccepted,
  onFileRejected,
}: UploadComponentProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        const errorCode = rejection.errors[0]?.code;

        if (errorCode === 'file-too-large') {
          onFileRejected({
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds 10MB limit. Please upload a smaller file.',
          });
        } else if (errorCode === 'file-invalid-type') {
          onFileRejected({
            code: 'INVALID_TYPE',
            message: 'Unsupported file type. Please upload PNG, JPG, JPEG, or PDF files.',
          });
        } else {
          onFileRejected({
            code: 'UPLOAD_FAILED',
            message: 'Upload failed. Please check your connection and try again.',
          });
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        onFileAccepted(acceptedFiles[0]);
      }
    },
    [onFileAccepted, onFileRejected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors duration-200 ease-in-out
          ${isDragActive
            ? 'border-blue-500 bg-blue-950/30'
            : 'border-gray-700 bg-black hover:border-gray-600 hover:bg-zinc-950'
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center space-y-4">
          <svg
            className={`w-16 h-16 ${isDragActive ? 'text-blue-500' : 'text-gray-500'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {isDragActive ? (
            <p className="text-lg font-medium text-blue-400">
              Drop your document here
            </p>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-200">
                Drag and drop your document here
              </p>
              <p className="text-sm text-gray-400">or click to browse</p>
            </>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p>Supported formats: PNG, JPG, JPEG, PDF</p>
            <p>Maximum file size: 10MB</p>
          </div>
        </div>
      </div>
    </div>
  );
}
