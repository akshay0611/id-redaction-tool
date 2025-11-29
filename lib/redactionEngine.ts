import { DetectionResult, RedactedDocument } from '@/types';
import { PDFDocument, rgb } from 'pdf-lib';

/**
 * RedactionEngine class for applying redactions to documents
 */
export class RedactionEngine {
  /**
   * Apply redactions to a document based on detection results
   * Routes to appropriate redaction method based on file type
   */
  async applyRedactions(
    file: File,
    detections: DetectionResult
  ): Promise<RedactedDocument> {
    const mimeType = file.type;
    
    // Route based on file type
    if (mimeType === 'application/pdf') {
      return this.redactPDF(file, detections);
    } else if (mimeType.startsWith('image/')) {
      return this.redactImage(file, detections);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  /**
   * Redact an image file using Canvas API
   */
  private async redactImage(
    file: File,
    detections: DetectionResult
  ): Promise<RedactedDocument> {
    return new Promise((resolve, reject) => {
      // Create an image element to load the file
      const img = new Image();
      
      img.onload = () => {
        try {
          // Create a canvas with the same dimensions as the image
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Draw the original image onto the canvas
          ctx.drawImage(img, 0, 0);
          
          // Collect all detections from all types (only page 1 for images)
          const allDetections = [
            ...detections.aadhaarNumbers,
            ...detections.panNumbers,
            ...detections.phoneNumbers,
            ...detections.addresses,
          ].filter(detection => detection.pageNumber === 1);
          
          // Apply black rectangles over detected regions
          ctx.fillStyle = 'rgb(0, 0, 0)'; // Pure black
          
          for (const detection of allDetections) {
            const { x, y, width, height } = detection.bbox;
            ctx.fillRect(x, y, width, height);
          }
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }
            
            // Create preview URL
            const previewUrl = URL.createObjectURL(blob);
            
            resolve({
              blob,
              mimeType: file.type,
              previewUrl,
            });
          }, file.type);
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      // Load the image from the file
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Redact a PDF file using pdf-lib
   */
  private async redactPDF(
    file: File,
    detections: DetectionResult
  ): Promise<RedactedDocument> {
    // Read the PDF file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    
    // Collect all detections
    const allDetections = [
      ...detections.aadhaarNumbers,
      ...detections.panNumbers,
      ...detections.phoneNumbers,
      ...detections.addresses,
    ];
    
    // Group detections by page
    const detectionsByPage = new Map<number, typeof allDetections>();
    for (const detection of allDetections) {
      const pageDetections = detectionsByPage.get(detection.pageNumber) || [];
      pageDetections.push(detection);
      detectionsByPage.set(detection.pageNumber, pageDetections);
    }
    
    // Apply redactions to each page
    for (const [pageNumber, pageDetections] of Array.from(detectionsByPage.entries())) {
      // Page numbers are 1-indexed in our system, but 0-indexed in pdf-lib
      const pageIndex = pageNumber - 1;
      
      if (pageIndex < 0 || pageIndex >= pages.length) {
        continue; // Skip invalid page numbers
      }
      
      const page = pages[pageIndex];
      const { height } = page.getSize();
      
      // Draw black rectangles over detected regions
      for (const detection of pageDetections) {
        const { x, y, width, height: bboxHeight } = detection.bbox;
        
        // PDF coordinates are from bottom-left, but our OCR coordinates are from top-left
        // So we need to flip the y-coordinate
        const pdfY = height - y - bboxHeight;
        
        // Draw a filled black rectangle
        page.drawRectangle({
          x,
          y: pdfY,
          width,
          height: bboxHeight,
          color: rgb(0, 0, 0), // Pure black
          opacity: 1,
        });
      }
    }
    
    // Save the modified PDF
    const pdfBytes = await pdfDoc.save();
    
    // Create a blob from the PDF bytes
    // Convert to a standard Uint8Array to ensure compatibility
    const uint8Array = new Uint8Array(pdfBytes);
    const blob = new Blob([uint8Array], { type: 'application/pdf' });
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(blob);
    
    return {
      blob,
      mimeType: 'application/pdf',
      previewUrl,
    };
  }
}

// Export a singleton instance
let redactionEngineInstance: RedactionEngine | null = null;

export function getRedactionEngine(): RedactionEngine {
  if (!redactionEngineInstance) {
    redactionEngineInstance = new RedactionEngine();
  }
  return redactionEngineInstance;
}
