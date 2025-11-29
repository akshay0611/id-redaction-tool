# Implementation Plan

- [x] 1. Initialize Next.js project with dependencies
  - Create Next.js 14 project with App Router and TypeScript
  - Install and configure Tailwind CSS
  - Install core dependencies: tesseract.js, pdf-lib, pdfjs-dist, react-dropzone, fast-check, vitest
  - Set up project structure with folders: components, lib, types, utils, tests
  - _Requirements: All_

- [x] 2. Define TypeScript types and interfaces
  - Create types for OCR results (OCRResult, PageData, TextBlock, BoundingBox)
  - Create types for detection results (DetectionResult, Detection)
  - Create types for redacted documents (RedactedDocument)
  - Create types for processing state (ProcessingState, AppState)
  - Create types for file errors (FileError)
  - _Requirements: 1.4, 1.5, 2.1, 2.2, 3.4, 4.3, 5.4, 6.3_

- [x] 3. Implement file upload and validation
  - [x] 3.1 Create UploadComponent with drag-and-drop interface using react-dropzone
    - Implement file selection UI with clear instructions
    - Add drag-and-drop zone with visual feedback
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 3.2 Implement file validation logic
    - Validate file types (PNG, JPG, JPEG, PDF)
    - Validate file size (max 10MB)
    - Return appropriate error codes for invalid files
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [ ]* 3.3 Write property test for file validation
    - **Property 1: Valid file type acceptance**
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 3.4 Write unit tests for file validation edge cases
    - Test file size limit (10MB boundary)
    - Test unsupported file types
    - _Requirements: 1.4, 1.5_

- [x] 4. Implement OCR service
  - [x] 4.1 Create OCR service using Tesseract.js
    - Initialize Tesseract worker
    - Implement extractText function for images
    - Extract text with bounding box coordinates
    - Handle multi-page PDFs by converting pages to images
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 4.2 Add error handling for OCR failures
    - Handle OCR initialization errors
    - Handle text extraction failures
    - Return user-friendly error messages
    - _Requirements: 2.3_

  - [ ]* 4.3 Write property test for OCR text extraction
    - **Property 2: OCR text extraction completeness**
    - **Validates: Requirements 2.1**

  - [ ]* 4.4 Write property test for OCR coordinate preservation
    - **Property 3: OCR spatial coordinate preservation**
    - **Validates: Requirements 2.2**

  - [ ]* 4.5 Write property test for multi-page PDF processing
    - **Property 4: Multi-page PDF processing**
    - **Validates: Requirements 2.4**

- [x] 5. Implement pattern detection service
  - [x] 5.1 Create PatternDetector class with detection methods
    - Implement detectPII function that calls all pattern detectors
    - Return DetectionResult with all detected PII
    - _Requirements: 3.1, 4.1, 5.1, 6.1_

  - [x] 5.2 Implement Aadhaar number detection
    - Create regex patterns for plain, space-separated, and hyphen-separated formats
    - Extract matches with their positions from OCR text blocks
    - Map matches to bounding boxes
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 5.3 Write property test for Aadhaar detection
    - **Property 5: Aadhaar number detection across formats**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 5.4 Implement PAN number detection
    - Create regex pattern for PAN format (5 letters, 4 digits, 1 letter)
    - Extract matches with their positions from OCR text blocks
    - Map matches to bounding boxes
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 5.5 Write property test for PAN detection
    - **Property 6: PAN number detection and validation**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 5.6 Implement phone number detection
    - Create regex patterns for various phone formats (plain, +91, with separators)
    - Extract matches with their positions from OCR text blocks
    - Map matches to bounding boxes
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 5.7 Write property test for phone detection
    - **Property 7: Phone number detection across formats**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [x] 5.8 Implement address detection
    - Create regex pattern for 6-digit PIN codes
    - Implement heuristic for multi-line address blocks with keywords
    - Extract address regions with bounding boxes
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 5.9 Write property test for address detection
    - **Property 8: Address detection with PIN codes**
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 5.10 Write property test for detection location marking
    - **Property 9: Detection location marking**
    - **Validates: Requirements 3.4, 4.3, 5.4, 6.3**

- [x] 6. Implement redaction engine
  - [x] 6.1 Create RedactionEngine class
    - Implement applyRedactions function
    - Route to image or PDF redaction based on file type
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 6.2 Implement image redaction using Canvas API
    - Load image onto canvas
    - Draw black rectangles over detected regions
    - Export canvas as blob
    - Ensure redactions are permanent
    - _Requirements: 7.1, 7.2, 7.4_

  - [x] 6.3 Implement PDF redaction using pdf-lib
    - Load PDF document
    - Add black rectangle annotations over detected regions on each page
    - Remove text content in redacted areas
    - Export modified PDF as blob
    - Ensure redactions are permanent
    - _Requirements: 7.1, 7.3, 7.4_

  - [ ]* 6.4 Write property test for complete redaction coverage
    - **Property 10: Complete redaction coverage**
    - **Validates: Requirements 7.1**

  - [ ]* 6.5 Write property test for redaction irreversibility
    - **Property 11: Redaction irreversibility**
    - **Validates: Requirements 7.2, 7.3**

  - [ ]* 6.6 Write property test for dimension preservation
    - **Property 12: Document dimension preservation**
    - **Validates: Requirements 7.4**

  - [ ]* 6.7 Write property test for non-redacted content preservation
    - **Property 13: Non-redacted content preservation**
    - **Validates: Requirements 8.3, 9.2**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement preview component
  - [x] 8.1 Create PreviewComponent for displaying redacted documents
    - Display image preview using img tag with object URL
    - Display PDF preview using PDF.js canvas rendering
    - Show detection count summary (Aadhaar, PAN, phone, address)
    - Add navigation controls for multi-page PDFs
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 8.2 Write unit tests for preview component
    - Test preview rendering for images
    - Test preview rendering for PDFs
    - Test page navigation for multi-page PDFs
    - _Requirements: 8.1, 8.4_

- [-] 9. Implement download handler
  - [x] 9.1 Create DownloadHandler utility
    - Generate download link from blob
    - Trigger download with original filename + "_redacted" suffix
    - Preserve file format (image or PDF)
    - Clean up object URLs after download
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 9.2 Write property test for format preservation
    - **Property 14: Format preservation**
    - **Validates: Requirements 9.1**

  - [ ]* 9.3 Write property test for PDF structure validity
    - **Property 15: PDF structure validity**
    - **Validates: Requirements 9.3**

- [x] 10. Implement state management
  - [x] 10.1 Create processing state reducer
    - Define state transitions: idle → uploading → extracting → detecting → redacting → complete
    - Handle error states
    - Implement state update actions
    - _Requirements: 10.2_

  - [x] 10.2 Create main App component with state management
    - Initialize processing state
    - Wire up upload, OCR, detection, redaction, and download handlers
    - Pass state to child components
    - _Requirements: All_

  - [ ]* 10.3 Write property test for state transitions
    - **Property 16: Progress state transitions**
    - **Validates: Requirements 10.2**

- [x] 11. Implement error handling and user feedback
  - [x] 11.1 Create error message mapping
    - Map error codes to user-friendly messages
    - Implement error display component
    - _Requirements: 10.3_

  - [x] 11.2 Add progress indicators
    - Show loading spinner during processing
    - Display current processing stage
    - Show progress percentage for multi-page PDFs
    - _Requirements: 10.2_

  - [ ]* 11.3 Write property test for error message display
    - **Property 17: Error message display**
    - **Validates: Requirements 10.3**

  - [ ]* 11.4 Write unit tests for error handling
    - Test file upload errors
    - Test OCR errors
    - Test redaction errors
    - _Requirements: 1.4, 1.5, 2.3_

- [ ] 12. Build main page UI
  - [x] 12.1 Create home page with Tailwind styling
    - Design minimal, clean layout
    - Add upload section with instructions
    - Add processing status section
    - Add preview section
    - Add download section
    - Ensure responsive design for mobile and desktop
    - _Requirements: 10.1, 10.4_

  - [x] 12.2 Wire all components together
    - Connect UploadComponent to state management
    - Connect PreviewComponent to state management
    - Connect download handler to UI button
    - Add reset functionality to start over
    - _Requirements: All_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
