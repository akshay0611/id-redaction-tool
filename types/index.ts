// File Error Types
export interface FileError {
  code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'UPLOAD_FAILED';
  message: string;
}

// OCR Result Types
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextBlock {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface PageData {
  pageNumber: number;
  width: number;
  height: number;
  textBlocks: TextBlock[];
}

export interface OCRResult {
  pages: PageData[];
  success: boolean;
  error?: string;
}

// Detection Result Types
export type DetectionType = 'AADHAAR' | 'PAN' | 'PHONE' | 'ADDRESS';

export interface Detection {
  type: DetectionType;
  value: string;
  confidence: number;
  bbox: BoundingBox;
  pageNumber: number;
}

export interface DetectionResult {
  aadhaarNumbers: Detection[];
  panNumbers: Detection[];
  phoneNumbers: Detection[];
  addresses: Detection[];
}

// Redacted Document Types
export interface RedactedDocument {
  blob: Blob;
  mimeType: string;
  previewUrl: string;
}

// Processing State Types
export type ProcessingState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'extracting'; currentPage?: number; totalPages?: number }
  | { status: 'detecting' }
  | { status: 'redacting'; currentPage?: number; totalPages?: number }
  | { status: 'complete'; result: RedactedDocument; detections: DetectionResult }
  | { status: 'error'; error: string };

// Application State Types
export interface AppState {
  processingState: ProcessingState;
  originalFile: File | null;
  redactedDocument: RedactedDocument | null;
}
