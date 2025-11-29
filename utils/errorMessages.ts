/**
 * Error message mapping utility
 * Maps error codes and types to user-friendly messages
 */

import { FileError } from '@/types';

/**
 * Error codes for different types of errors
 */
export type ErrorCode =
  | 'FILE_TOO_LARGE'
  | 'INVALID_TYPE'
  | 'UPLOAD_FAILED'
  | 'OCR_FAILED'
  | 'NO_TEXT_DETECTED'
  | 'MULTIPAGE_ERROR'
  | 'REDACTION_FAILED'
  | 'PDF_GENERATION_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Error message configuration
 */
interface ErrorMessageConfig {
  title: string;
  message: string;
  actionable?: string;
}

/**
 * Map of error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<ErrorCode, ErrorMessageConfig> = {
  // File Upload Errors
  FILE_TOO_LARGE: {
    title: 'File Too Large',
    message: 'File size exceeds 10MB limit. Please upload a smaller file.',
    actionable: 'Try compressing your document or splitting it into smaller files.',
  },
  INVALID_TYPE: {
    title: 'Unsupported File Type',
    message: 'Unsupported file type. Please upload PNG, JPG, JPEG, or PDF files.',
    actionable: 'Convert your document to a supported format and try again.',
  },
  UPLOAD_FAILED: {
    title: 'Upload Failed',
    message: 'Upload failed. Please check your connection and try again.',
    actionable: 'Ensure you have a stable internet connection and try uploading again.',
  },

  // OCR Processing Errors
  OCR_FAILED: {
    title: 'Text Extraction Failed',
    message: 'Unable to extract text from document. Please ensure the image is clear and try again.',
    actionable: 'Try uploading a higher quality scan or image of your document.',
  },
  NO_TEXT_DETECTED: {
    title: 'No Text Found',
    message: 'No text found in document. Please upload a document containing text.',
    actionable: 'Ensure your document contains readable text and is not blank.',
  },
  MULTIPAGE_ERROR: {
    title: 'Multi-page Processing Error',
    message: 'Error processing some pages. Some pages may not be redacted.',
    actionable: 'Try uploading the document again or split it into individual pages.',
  },

  // Redaction Errors
  REDACTION_FAILED: {
    title: 'Redaction Failed',
    message: 'Unable to apply redactions. Please try again.',
    actionable: 'Try uploading your document again or contact support if the issue persists.',
  },
  PDF_GENERATION_ERROR: {
    title: 'PDF Generation Error',
    message: 'Error creating redacted PDF. Please try again.',
    actionable: 'Try uploading your document again or convert it to an image format.',
  },

  // General Errors
  UNKNOWN_ERROR: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again.',
    actionable: 'If the problem persists, try refreshing the page or using a different browser.',
  },
};

/**
 * Get user-friendly error message for a given error code
 */
export function getErrorMessage(code: ErrorCode): ErrorMessageConfig {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Convert FileError to ErrorCode
 */
export function fileErrorToCode(error: FileError): ErrorCode {
  return error.code;
}

/**
 * Parse error message and determine error code
 */
export function parseErrorMessage(errorMessage: string): ErrorCode {
  const lowerMessage = errorMessage.toLowerCase();

  // OCR errors
  if (lowerMessage.includes('extract') || lowerMessage.includes('ocr')) {
    return 'OCR_FAILED';
  }
  if (lowerMessage.includes('no text')) {
    return 'NO_TEXT_DETECTED';
  }
  if (lowerMessage.includes('page') && lowerMessage.includes('error')) {
    return 'MULTIPAGE_ERROR';
  }

  // Redaction errors
  if (lowerMessage.includes('redact')) {
    return 'REDACTION_FAILED';
  }
  if (lowerMessage.includes('pdf') && lowerMessage.includes('generat')) {
    return 'PDF_GENERATION_ERROR';
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Format error for display
 */
export function formatError(error: string | FileError): ErrorMessageConfig {
  if (typeof error === 'string') {
    const code = parseErrorMessage(error);
    return getErrorMessage(code);
  } else {
    const code = fileErrorToCode(error);
    return getErrorMessage(code);
  }
}
