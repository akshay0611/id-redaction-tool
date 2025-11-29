import { FileError } from '@/types';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const ACCEPTED_PDF_TYPE = 'application/pdf';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export const ACCEPTED_FILE_TYPES = [...ACCEPTED_IMAGE_TYPES, ACCEPTED_PDF_TYPE];

/**
 * Validates a file based on type and size requirements
 * @param file - The file to validate
 * @returns FileError if validation fails, null if validation passes
 */
export function validateFile(file: File): FileError | null {
  // Validate file type
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return {
      code: 'INVALID_TYPE',
      message: 'Unsupported file type. Please upload PNG, JPG, JPEG, or PDF files.',
    };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      code: 'FILE_TOO_LARGE',
      message: 'File size exceeds 10MB limit. Please upload a smaller file.',
    };
  }

  return null;
}

/**
 * Checks if a file is a valid image type
 * @param file - The file to check
 * @returns true if the file is a valid image type
 */
export function isImageFile(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}

/**
 * Checks if a file is a PDF
 * @param file - The file to check
 * @returns true if the file is a PDF
 */
export function isPDFFile(file: File): boolean {
  return file.type === ACCEPTED_PDF_TYPE;
}

/**
 * Gets the file extension from a filename
 * @param filename - The filename to extract extension from
 * @returns The file extension (e.g., 'png', 'pdf')
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}
