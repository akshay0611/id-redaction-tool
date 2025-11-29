# Design Document

## Overview

The Document Redaction Tool is a Next.js web application that provides automated redaction of sensitive personal information from uploaded documents. The system uses OCR technology to extract text, pattern matching algorithms to identify PII (Aadhaar numbers, PAN numbers, phone numbers, addresses), and image processing to apply permanent redactions. The architecture emphasizes client-side processing where possible for privacy, with server-side processing for OCR operations.

## Architecture

### Technology Stack

- **Frontend Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **OCR Engine**: Tesseract.js (client-side) with fallback to server-side processing for PDFs
- **PDF Processing**: pdf-lib for manipulation, PDF.js for rendering
- **Image Processing**: Canvas API for redaction overlays
- **File Handling**: React Dropzone for upload interface
- **State Management**: React hooks (useState, useReducer)

### System Architecture

The application follows a three-tier architecture:

1. **Presentation Layer**: React components handling user interactions, file uploads, preview, and download
2. **Processing Layer**: OCR extraction, pattern detection, and redaction application
3. **Storage Layer**: Temporary in-memory storage (no persistent storage)

```
User Interface (Next.js + Tailwind)
         ↓
Upload Handler → File Validator
         ↓
OCR Processor (Tesseract.js / Server API)
         ↓
Text Extractor → Coordinate Mapper
         ↓
Pattern Detector (Aadhaar, PAN, Phone, Address)
         ↓
Redaction Engine (Canvas API / pdf-lib)
         ↓
Preview Generator
         ↓
Download Handler
```

## Components and Interfaces

### 1. Upload Component

**Responsibility**: Handle file selection and validation

**Interface**:
```typescript
interface UploadComponentProps {
  onFileAccepted: (file: File) => void;
  onFileRejected: (error: FileError) => void;
}

interface FileError {
  code: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'UPLOAD_FAILED';
  message: string;
}
```

**Behavior**:
- Accept PNG, JPG, JPEG, PDF files
- Validate file size (max 10MB)
- Provide drag-and-drop and click-to-upload interfaces
- Display upload progress

### 2. OCR Service

**Responsibility**: Extract text with spatial coordinates from documents

**Interface**:
```typescript
interface OCRService {
  extractText(file: File): Promise<OCRResult>;
}

interface OCRResult {
  pages: PageData[];
  success: boolean;
  error?: string;
}

interface PageData {
  pageNumber: number;
  width: number;
  height: number;
  textBlocks: TextBlock[];
}

interface TextBlock {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### 3. Pattern Detection Service

**Responsibility**: Identify sensitive information patterns in extracted text

**Interface**:
```typescript
interface PatternDetector {
  detectPII(ocrResult: OCRResult): DetectionResult;
}

interface DetectionResult {
  aadhaarNumbers: Detection[];
  panNumbers: Detection[];
  phoneNumbers: Detection[];
  addresses: Detection[];
}

interface Detection {
  type: 'AADHAAR' | 'PAN' | 'PHONE' | 'ADDRESS';
  value: string;
  confidence: number;
  bbox: BoundingBox;
  pageNumber: number;
}
```

**Detection Patterns**:
- **Aadhaar**: `/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g`
- **PAN**: `/\b[A-Z]{5}\d{4}[A-Z]\b/g`
- **Phone**: `/\b(\+91[\s-]?)?\d{10}\b/g` with variations
- **Address**: Multi-line heuristic based on PIN codes and keywords

### 4. Redaction Engine

**Responsibility**: Apply visual redactions to documents

**Interface**:
```typescript
interface RedactionEngine {
  applyRedactions(
    file: File,
    detections: DetectionResult
  ): Promise<RedactedDocument>;
}

interface RedactedDocument {
  blob: Blob;
  mimeType: string;
  previewUrl: string;
}
```

**Behavior**:
- For images: Use Canvas API to draw black rectangles over detected regions
- For PDFs: Use pdf-lib to add black rectangle annotations
- Ensure redactions are permanent and non-reversible

### 5. Preview Component

**Responsibility**: Display redacted document for user verification

**Interface**:
```typescript
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
```

### 6. Download Handler

**Responsibility**: Provide redacted document to user

**Interface**:
```typescript
interface DownloadHandler {
  downloadDocument(document: RedactedDocument, originalFilename: string): void;
}
```

## Data Models

### File Processing State

```typescript
type ProcessingState = 
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'extracting' }
  | { status: 'detecting' }
  | { status: 'redacting' }
  | { status: 'complete'; result: RedactedDocument; detections: DetectionResult }
  | { status: 'error'; error: string };
```

### Application State

```typescript
interface AppState {
  processingState: ProcessingState;
  originalFile: File | null;
  redactedDocument: RedactedDocument | null;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Valid file type acceptance
*For any* file with extension PNG, JPG, JPEG, or PDF and size under 10MB, the file validation function should accept the file
**Validates: Requirements 1.2, 1.3**

### Property 2: OCR text extraction completeness
*For any* valid document, the OCR service should return at least one text block if the document contains visible text
**Validates: Requirements 2.1**

### Property 3: OCR spatial coordinate preservation
*For any* OCR result, all text blocks should have valid bounding box coordinates (non-negative x, y, width, height values)
**Validates: Requirements 2.2**

### Property 4: Multi-page PDF processing
*For any* multi-page PDF, the number of pages in the OCR result should equal the number of pages in the source PDF
**Validates: Requirements 2.4**

### Property 5: Aadhaar number detection across formats
*For any* text containing a 12-digit Aadhaar number in any format (plain, space-separated, or hyphen-separated), the pattern detector should identify it
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 6: PAN number detection and validation
*For any* text containing a valid PAN number (5 letters, 4 digits, 1 letter), the pattern detector should identify it
**Validates: Requirements 4.1, 4.2**

### Property 7: Phone number detection across formats
*For any* text containing a 10-digit Indian phone number in any format (plain, with +91, with spaces/hyphens/parentheses), the pattern detector should identify it
**Validates: Requirements 5.1, 5.2, 5.3**

### Property 8: Address detection with PIN codes
*For any* text containing a 6-digit PIN code along with address keywords (street, city, state), the pattern detector should identify it as an address
**Validates: Requirements 6.1, 6.2**

### Property 9: Detection location marking
*For any* detection result (Aadhaar, PAN, phone, or address), each detection should have a valid bounding box with non-negative coordinates
**Validates: Requirements 3.4, 4.3, 5.4, 6.3**

### Property 10: Complete redaction coverage
*For any* detection with a bounding box, the redaction engine should apply a black overlay that completely covers the specified area
**Validates: Requirements 7.1**

### Property 11: Redaction irreversibility
*For any* redacted document (image or PDF), all pixels within redacted bounding boxes should be completely black (RGB 0,0,0) with no recoverable original data
**Validates: Requirements 7.2, 7.3**

### Property 12: Document dimension preservation
*For any* document, the dimensions (width and height) of the redacted document should equal the dimensions of the original document
**Validates: Requirements 7.4**

### Property 13: Non-redacted content preservation
*For any* document, pixels outside redacted bounding boxes should remain unchanged from the original document
**Validates: Requirements 8.3, 9.2**

### Property 14: Format preservation
*For any* document, the MIME type of the redacted document should match the MIME type of the original document
**Validates: Requirements 9.1**

### Property 15: PDF structure validity
*For any* PDF document, the redacted PDF should be a valid PDF that can be opened and rendered without errors
**Validates: Requirements 9.3**

### Property 16: Progress state transitions
*For any* processing workflow, the state should transition through the sequence: idle → uploading → extracting → detecting → redacting → complete, without skipping states
**Validates: Requirements 10.2**

### Property 17: Error message display
*For any* error condition (file too large, invalid type, OCR failure), the system should display an error message to the user
**Validates: Requirements 10.3**

## Error Handling

### File Upload Errors

- **File Too Large**: Display "File size exceeds 10MB limit. Please upload a smaller file."
- **Invalid File Type**: Display "Unsupported file type. Please upload PNG, JPG, JPEG, or PDF files."
- **Upload Failed**: Display "Upload failed. Please check your connection and try again."

### OCR Processing Errors

- **Text Extraction Failed**: Display "Unable to extract text from document. Please ensure the image is clear and try again."
- **No Text Detected**: Display "No text found in document. Please upload a document containing text."
- **Multi-page Processing Error**: Display "Error processing page X of Y. Some pages may not be redacted."

### Redaction Errors

- **Redaction Failed**: Display "Unable to apply redactions. Please try again."
- **PDF Generation Error**: Display "Error creating redacted PDF. Please try again."

### General Error Handling Strategy

1. All errors should be caught and converted to user-friendly messages
2. Error states should allow users to retry or upload a new document
3. Errors should be logged (client-side console) for debugging
4. Critical errors should clear processing state and return to idle

## Testing Strategy

### Unit Testing

The application will use **Vitest** as the testing framework for unit tests. Unit tests will cover:

- **File validation logic**: Test specific examples of valid/invalid files, size limits, and type checking
- **Pattern detection functions**: Test specific examples of Aadhaar, PAN, phone, and address patterns
- **Bounding box calculations**: Test coordinate transformations and overlap detection
- **State management**: Test state transitions and reducer logic
- **Error handling**: Test specific error conditions and message generation

### Property-Based Testing

The application will use **fast-check** as the property-based testing library. Property-based tests will verify universal properties across randomly generated inputs:

- Each property-based test will run a minimum of 100 iterations
- Each test will be tagged with a comment referencing the correctness property: `// Feature: document-redaction-tool, Property X: [property text]`
- Each correctness property will be implemented by a single property-based test

Property-based tests will cover:

- **File validation**: Generate random files with various sizes and types
- **Pattern detection**: Generate random text with embedded PII in various formats
- **OCR result validation**: Generate random OCR results and verify coordinate validity
- **Redaction coverage**: Generate random detections and verify complete coverage
- **Dimension preservation**: Generate random documents and verify dimensions are maintained
- **Format preservation**: Generate random documents and verify MIME types are preserved
- **State transitions**: Generate random sequences of actions and verify valid state progression

### Integration Testing

Integration tests will verify end-to-end workflows:

- Upload → OCR → Detection → Redaction → Preview → Download
- Error recovery flows
- Multi-page PDF processing

### Test Data

- Sample documents with known PII for validation
- Edge cases: empty documents, documents with no text, documents with only PII
- Various image formats and qualities
- Single and multi-page PDFs

## Performance Considerations

### Client-Side Processing

- Use Web Workers for OCR processing to avoid blocking the main thread
- Implement progressive rendering for large documents
- Use canvas-based processing for images to leverage GPU acceleration

### Memory Management

- Process multi-page PDFs one page at a time
- Release object URLs after download
- Clear canvas contexts after processing

### Optimization Targets

- OCR processing: < 5 seconds for typical single-page document
- Redaction application: < 2 seconds
- Preview generation: < 1 second
- Total workflow: < 10 seconds for single-page document

## Security Considerations

### Client-Side Processing Priority

- Perform OCR and redaction client-side when possible to minimize data transmission
- Only send data to server when client-side processing is insufficient (e.g., complex PDFs)

### Data Handling

- Never store uploaded documents on server
- Use temporary in-memory storage only
- Clear all data on page unload or session end
- Use HTTPS for all communications

### Redaction Security

- Ensure redactions are permanent and cannot be reversed
- Verify no metadata contains original text
- Test that PDF text layers are properly removed in redacted areas

## Deployment

### Environment

- Deploy on Vercel or similar Next.js-optimized platform
- Use serverless functions for any server-side OCR processing
- Configure appropriate timeout limits for processing functions

### Configuration

- Set maximum file size limit (10MB)
- Configure OCR language support (English, Hindi for Indian documents)
- Set up error logging and monitoring

## Future Enhancements

- Support for additional document types (Word, Excel)
- Manual selection/deselection of detected items
- Custom redaction patterns
- Batch processing of multiple documents
- Additional PII types (email addresses, dates of birth)
- Multi-language support for OCR
