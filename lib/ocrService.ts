import { createWorker, Worker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { OCRResult, PageData, TextBlock, BoundingBox } from '@/types';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

/**
 * OCR Error types for better error handling
 */
export class OCRError extends Error {
  constructor(message: string, public readonly userMessage: string) {
    super(message);
    this.name = 'OCRError';
  }
}

/**
 * Get user-friendly error message based on error type
 */
function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof OCRError) {
    return error.userMessage;
  }
  
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
  
  if (errorMessage.includes('worker') || errorMessage.includes('initialize')) {
    return 'Unable to initialize text extraction. Please refresh the page and try again.';
  }
  
  if (errorMessage.includes('load') || errorMessage.includes('decode')) {
    return 'Unable to extract text from document. Please ensure the image is clear and try again.';
  }
  
  if (errorMessage.includes('pdf')) {
    return 'Error processing PDF. Please ensure the file is not corrupted and try again.';
  }
  
  if (errorMessage.includes('canvas') || errorMessage.includes('render')) {
    return 'Error processing page. Please try again.';
  }
  
  return 'Unable to extract text from document. Please ensure the image is clear and try again.';
}

export class OCRService {
  private worker: Worker | null = null;
  private isInitialized = false;

  /**
   * Initialize the Tesseract worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.worker = await createWorker('eng');
      this.isInitialized = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new OCRError(
        `Failed to initialize OCR worker: ${message}`,
        'Unable to initialize text extraction. Please refresh the page and try again.'
      );
    }
  }

  /**
   * Extract text from a file (image or PDF)
   */
  async extractText(file: File): Promise<OCRResult> {
    try {
      // Initialize worker if not already done
      if (!this.isInitialized) {
        await this.initialize();
      }

      const fileType = file.type;

      // Handle PDF files
      if (fileType === 'application/pdf') {
        return await this.extractTextFromPDF(file);
      }

      // Handle image files
      if (fileType.startsWith('image/')) {
        return await this.extractTextFromImage(file);
      }

      return {
        pages: [],
        success: false,
        error: 'Unsupported file type. Please upload PNG, JPG, JPEG, or PDF files.',
      };
    } catch (error) {
      const userMessage = getUserFriendlyErrorMessage(error);
      return {
        pages: [],
        success: false,
        error: userMessage,
      };
    }
  }

  /**
   * Extract text from an image file
   */
  private async extractTextFromImage(file: File): Promise<OCRResult> {
    if (!this.worker) {
      throw new OCRError(
        'OCR worker not initialized',
        'Text extraction service not ready. Please try again.'
      );
    }

    let imageUrl: string | null = null;
    
    try {
      imageUrl = URL.createObjectURL(file);
      
      // Get image dimensions
      const img = await this.loadImage(imageUrl);
      const width = img.width;
      const height = img.height;

      // Perform OCR
      const result = await this.worker.recognize(imageUrl);

      // Extract text blocks with bounding boxes
      const textBlocks: TextBlock[] = [];
      
      if (result.data.words) {
        for (const word of result.data.words) {
          if (word.text.trim()) {
            textBlocks.push({
              text: word.text,
              confidence: word.confidence / 100, // Normalize to 0-1
              bbox: {
                x: word.bbox.x0,
                y: word.bbox.y0,
                width: word.bbox.x1 - word.bbox.x0,
                height: word.bbox.y1 - word.bbox.y0,
              },
            });
          }
        }
      }

      const pageData: PageData = {
        pageNumber: 1,
        width,
        height,
        textBlocks,
      };

      return {
        pages: [pageData],
        success: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new OCRError(
        `Image OCR failed: ${message}`,
        'Unable to extract text from document. Please ensure the image is clear and try again.'
      );
    } finally {
      // Clean up object URL
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    }
  }

  /**
   * Extract text from a PDF file by converting pages to images
   */
  private async extractTextFromPDF(file: File): Promise<OCRResult> {
    if (!this.worker) {
      throw new OCRError(
        'OCR worker not initialized',
        'Text extraction service not ready. Please try again.'
      );
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const pages: PageData[] = [];

      // Process each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        let imageUrl: string | null = null;
        
        try {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR

          // Create canvas to render PDF page
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (!context) {
            throw new OCRError(
              'Failed to get canvas context',
              `Error processing page ${pageNum} of ${numPages}. Some pages may not be redacted.`
            );
          }

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          // Render PDF page to canvas
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          // Convert canvas to blob for OCR
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => {
              if (b) resolve(b);
              else reject(new OCRError(
                'Failed to convert canvas to blob',
                `Error processing page ${pageNum} of ${numPages}. Some pages may not be redacted.`
              ));
            }, 'image/png');
          });

          imageUrl = URL.createObjectURL(blob);

          // Perform OCR on the page image
          const result = await this.worker.recognize(imageUrl);

          // Extract text blocks with bounding boxes
          const textBlocks: TextBlock[] = [];
          
          if (result.data.words) {
            for (const word of result.data.words) {
              if (word.text.trim()) {
                textBlocks.push({
                  text: word.text,
                  confidence: word.confidence / 100, // Normalize to 0-1
                  bbox: {
                    x: word.bbox.x0,
                    y: word.bbox.y0,
                    width: word.bbox.x1 - word.bbox.x0,
                    height: word.bbox.y1 - word.bbox.y0,
                  },
                });
              }
            }
          }

          pages.push({
            pageNumber: pageNum,
            width: viewport.width,
            height: viewport.height,
            textBlocks,
          });
        } catch (error) {
          // Log page-specific error but continue processing other pages
          console.error(`Error processing page ${pageNum}:`, error);
          
          // If it's the first page or a critical error, rethrow
          if (pageNum === 1 || error instanceof OCRError) {
            throw error;
          }
        } finally {
          // Clean up object URL for this page
          if (imageUrl) {
            URL.revokeObjectURL(imageUrl);
          }
        }
      }

      // Check if we got at least some pages
      if (pages.length === 0) {
        throw new OCRError(
          'No pages could be processed',
          'Unable to extract text from PDF. Please ensure the file is not corrupted and try again.'
        );
      }

      return {
        pages,
        success: true,
      };
    } catch (error) {
      if (error instanceof OCRError) {
        throw error;
      }
      
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new OCRError(
        `PDF OCR failed: ${message}`,
        'Error processing PDF. Please ensure the file is not corrupted and try again.'
      );
    }
  }

  /**
   * Load an image and return it as an HTMLImageElement
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new OCRError(
        'Failed to load image',
        'Unable to load image. Please ensure the file is a valid image and try again.'
      ));
      img.src = url;
    });
  }

  /**
   * Terminate the worker and clean up resources
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

// Export a singleton instance
let ocrServiceInstance: OCRService | null = null;

export function getOCRService(): OCRService {
  if (!ocrServiceInstance) {
    ocrServiceInstance = new OCRService();
  }
  return ocrServiceInstance;
}
