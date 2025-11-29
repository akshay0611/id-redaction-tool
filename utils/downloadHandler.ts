import { RedactedDocument } from '@/types';

/**
 * DownloadHandler utility for downloading redacted documents
 */
export class DownloadHandler {
  /**
   * Download a redacted document with the original filename + "_redacted" suffix
   * Preserves the file format and cleans up object URLs after download
   * 
   * @param redactedDoc - The redacted document to download
   * @param originalFilename - The original filename (with extension)
   */
  downloadDocument(redactedDoc: RedactedDocument, originalFilename: string): void {
    // Generate the new filename with "_redacted" suffix
    const filename = this.generateRedactedFilename(originalFilename);
    
    // Create a temporary anchor element to trigger the download
    const link = window.document.createElement('a');
    link.href = redactedDoc.previewUrl;
    link.download = filename;
    
    // Append to body (required for Firefox)
    window.document.body.appendChild(link);
    
    // Trigger the download
    link.click();
    
    // Clean up: remove the link element
    window.document.body.removeChild(link);
    
    // Schedule cleanup of the object URL after a short delay
    // This ensures the download has started before we revoke the URL
    setTimeout(() => {
      URL.revokeObjectURL(redactedDoc.previewUrl);
    }, 100);
  }
  
  /**
   * Generate a redacted filename by adding "_redacted" suffix before the extension
   * 
   * @param originalFilename - The original filename (e.g., "document.pdf")
   * @returns The redacted filename (e.g., "document_redacted.pdf")
   */
  private generateRedactedFilename(originalFilename: string): string {
    // Find the last dot to separate name and extension
    const lastDotIndex = originalFilename.lastIndexOf('.');
    
    if (lastDotIndex === -1) {
      // No extension found, just append "_redacted"
      return `${originalFilename}_redacted`;
    }
    
    // Split into name and extension
    const name = originalFilename.substring(0, lastDotIndex);
    const extension = originalFilename.substring(lastDotIndex);
    
    // Return name + "_redacted" + extension
    return `${name}_redacted${extension}`;
  }
}

/**
 * Export a singleton instance for convenience
 */
let downloadHandlerInstance: DownloadHandler | null = null;

export function getDownloadHandler(): DownloadHandler {
  if (!downloadHandlerInstance) {
    downloadHandlerInstance = new DownloadHandler();
  }
  return downloadHandlerInstance;
}
