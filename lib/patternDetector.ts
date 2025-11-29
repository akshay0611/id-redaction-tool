import { OCRResult, DetectionResult, Detection, BoundingBox, TextBlock } from '@/types';

/**
 * PatternDetector class for identifying PII in OCR results
 */
export class PatternDetector {
  /**
   * Detect all PII patterns in the OCR result
   */
  detectPII(ocrResult: OCRResult): DetectionResult {
    const aadhaarNumbers = this.detectAadhaar(ocrResult);
    const panNumbers = this.detectPAN(ocrResult);
    const phoneNumbers = this.detectPhone(ocrResult);
    const addresses = this.detectAddress(ocrResult);

    return {
      aadhaarNumbers,
      panNumbers,
      phoneNumbers,
      addresses,
    };
  }

  /**
   * Detect Aadhaar numbers in OCR result
   * Supports formats: 123456789012, 1234 5678 9012, 1234-5678-9012
   */
  private detectAadhaar(ocrResult: OCRResult): Detection[] {
    const detections: Detection[] = [];
    
    // Regex patterns for different Aadhaar formats
    // Plain: 12 consecutive digits
    // Space-separated: XXXX XXXX XXXX
    // Hyphen-separated: XXXX-XXXX-XXXX
    const aadhaarPatterns = [
      /\b\d{12}\b/g,                           // Plain format
      /\b\d{4}\s\d{4}\s\d{4}\b/g,             // Space-separated
      /\b\d{4}-\d{4}-\d{4}\b/g,               // Hyphen-separated
    ];

    for (const page of ocrResult.pages) {
      // Build full text from all text blocks for pattern matching
      const fullText = page.textBlocks.map(block => block.text).join(' ');
      
      // Try each pattern
      for (const pattern of aadhaarPatterns) {
        const matches = Array.from(fullText.matchAll(pattern));
        
        for (const match of matches) {
          if (match.index === undefined) continue;
          
          const matchedText = match[0];
          
          // Find the bounding box for this match
          const bbox = this.findBoundingBoxForMatch(
            matchedText,
            match.index,
            page.textBlocks,
            fullText
          );
          
          if (bbox) {
            detections.push({
              type: 'AADHAAR',
              value: matchedText,
              confidence: 0.9, // High confidence for regex matches
              bbox,
              pageNumber: page.pageNumber,
            });
          }
        }
      }
    }
    
    return detections;
  }

  /**
   * Find bounding box for a matched text at a specific position
   */
  private findBoundingBoxForMatch(
    matchedText: string,
    matchIndex: number,
    textBlocks: TextBlock[],
    fullText: string
  ): BoundingBox | null {
    // Calculate which text blocks contain this match
    let currentIndex = 0;
    const involvedBlocks: TextBlock[] = [];
    
    for (const block of textBlocks) {
      const blockStart = currentIndex;
      const blockEnd = currentIndex + block.text.length;
      
      // Check if this block overlaps with the match
      if (blockEnd > matchIndex && blockStart < matchIndex + matchedText.length) {
        involvedBlocks.push(block);
      }
      
      // Add 1 for the space we added when joining
      currentIndex = blockEnd + 1;
      
      if (currentIndex > matchIndex + matchedText.length) {
        break;
      }
    }
    
    if (involvedBlocks.length === 0) {
      return null;
    }
    
    // Merge bounding boxes of all involved blocks
    return this.mergeBoundingBoxes(involvedBlocks.map(block => block.bbox));
  }

  /**
   * Merge multiple bounding boxes into one that encompasses all
   */
  private mergeBoundingBoxes(boxes: BoundingBox[]): BoundingBox {
    if (boxes.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    if (boxes.length === 1) {
      return boxes[0];
    }
    
    const minX = Math.min(...boxes.map(b => b.x));
    const minY = Math.min(...boxes.map(b => b.y));
    const maxX = Math.max(...boxes.map(b => b.x + b.width));
    const maxY = Math.max(...boxes.map(b => b.y + b.height));
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Detect PAN numbers in OCR result
   * Format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
   */
  private detectPAN(ocrResult: OCRResult): Detection[] {
    const detections: Detection[] = [];
    
    // PAN format: 5 uppercase letters, 4 digits, 1 uppercase letter
    const panPattern = /\b[A-Z]{5}\d{4}[A-Z]\b/g;

    for (const page of ocrResult.pages) {
      // Build full text from all text blocks for pattern matching
      const fullText = page.textBlocks.map(block => block.text).join(' ');
      
      const matches = Array.from(fullText.matchAll(panPattern));
      
      for (const match of matches) {
        if (match.index === undefined) continue;
        
        const matchedText = match[0];
        
        // Find the bounding box for this match
        const bbox = this.findBoundingBoxForMatch(
          matchedText,
          match.index,
          page.textBlocks,
          fullText
        );
        
        if (bbox) {
          detections.push({
            type: 'PAN',
            value: matchedText,
            confidence: 0.9, // High confidence for regex matches
            bbox,
            pageNumber: page.pageNumber,
          });
        }
      }
    }
    
    return detections;
  }

  /**
   * Detect phone numbers in OCR result
   * Supports various formats: 9876543210, +91 9876543210, +91-9876543210, (91) 9876543210, etc.
   */
  private detectPhone(ocrResult: OCRResult): Detection[] {
    const detections: Detection[] = [];
    
    // Phone number patterns for Indian mobile numbers
    const phonePatterns = [
      /\b\d{10}\b/g,                                    // Plain 10 digits
      /\+91[\s-]?\d{10}\b/g,                           // +91 with optional space/hyphen
      /\b91[\s-]\d{10}\b/g,                            // 91 with space/hyphen
      /\(\+?91\)[\s-]?\d{10}\b/g,                      // (91) or (+91) format
      /\b\d{5}[\s-]\d{5}\b/g,                          // 5-5 digit format
      /\b\d{3}[\s-]\d{3}[\s-]\d{4}\b/g,                // 3-3-4 digit format
    ];

    for (const page of ocrResult.pages) {
      // Build full text from all text blocks for pattern matching
      const fullText = page.textBlocks.map(block => block.text).join(' ');
      
      // Track detected phone numbers to avoid duplicates
      const detectedValues = new Set<string>();
      
      // Try each pattern
      for (const pattern of phonePatterns) {
        const matches = Array.from(fullText.matchAll(pattern));
        
        for (const match of matches) {
          if (match.index === undefined) continue;
          
          const matchedText = match[0];
          
          // Normalize the phone number to check for duplicates
          const normalized = matchedText.replace(/\D/g, '');
          
          // Skip if we've already detected this number (in different format)
          if (detectedValues.has(normalized)) {
            continue;
          }
          
          // Validate that it's a valid Indian mobile number (should start with 6-9)
          const digits = normalized.replace(/^91/, ''); // Remove country code if present
          if (digits.length === 10 && /^[6-9]/.test(digits)) {
            detectedValues.add(normalized);
            
            // Find the bounding box for this match
            const bbox = this.findBoundingBoxForMatch(
              matchedText,
              match.index,
              page.textBlocks,
              fullText
            );
            
            if (bbox) {
              detections.push({
                type: 'PHONE',
                value: matchedText,
                confidence: 0.85, // Slightly lower confidence due to potential false positives
                bbox,
                pageNumber: page.pageNumber,
              });
            }
          }
        }
      }
    }
    
    return detections;
  }

  /**
   * Detect addresses in OCR result
   * Uses PIN codes and address keywords to identify address blocks
   */
  private detectAddress(ocrResult: OCRResult): Detection[] {
    const detections: Detection[] = [];
    
    // PIN code pattern: 6 digits
    const pinPattern = /\b\d{6}\b/g;
    
    // Address keywords (case-insensitive)
    const addressKeywords = [
      'street', 'road', 'avenue', 'lane', 'colony', 'sector',
      'city', 'town', 'village', 'district', 'state',
      'pin', 'pincode', 'postal', 'zip',
      'address', 'residence', 'house', 'flat', 'apartment',
      'building', 'block', 'floor',
      'nagar', 'marg', 'gali', 'chowk', 'pura', 'pur', 'ganj'
    ];

    for (const page of ocrResult.pages) {
      // Build full text from all text blocks
      const fullText = page.textBlocks.map(block => block.text).join(' ');
      
      // Find all PIN codes
      const pinMatches = Array.from(fullText.matchAll(pinPattern));
      
      for (const pinMatch of pinMatches) {
        if (pinMatch.index === undefined) continue;
        
        const pinCode = pinMatch[0];
        const pinIndex = pinMatch.index;
        
        // Look for address keywords near the PIN code
        // Check text within ~200 characters before and after the PIN
        const contextStart = Math.max(0, pinIndex - 200);
        const contextEnd = Math.min(fullText.length, pinIndex + pinCode.length + 200);
        const context = fullText.substring(contextStart, contextEnd).toLowerCase();
        
        // Check if any address keywords are present
        const hasAddressKeyword = addressKeywords.some(keyword => 
          context.includes(keyword.toLowerCase())
        );
        
        if (hasAddressKeyword) {
          // Find text blocks that are part of this address
          // We'll include blocks within the context window
          const addressBlocks: TextBlock[] = [];
          let currentIndex = 0;
          
          for (const block of page.textBlocks) {
            const blockStart = currentIndex;
            const blockEnd = currentIndex + block.text.length;
            
            // Include blocks that overlap with our context window
            if (blockEnd >= contextStart && blockStart <= contextEnd) {
              addressBlocks.push(block);
            }
            
            currentIndex = blockEnd + 1; // +1 for the space
          }
          
          if (addressBlocks.length > 0) {
            // Merge bounding boxes of all address blocks
            const bbox = this.mergeBoundingBoxes(addressBlocks.map(b => b.bbox));
            
            // Extract the address text
            const addressText = addressBlocks.map(b => b.text).join(' ');
            
            detections.push({
              type: 'ADDRESS',
              value: addressText.trim(),
              confidence: 0.75, // Lower confidence due to heuristic nature
              bbox,
              pageNumber: page.pageNumber,
            });
          }
        }
      }
    }
    
    // Remove duplicate/overlapping addresses
    return this.deduplicateAddresses(detections);
  }

  /**
   * Remove duplicate or heavily overlapping address detections
   */
  private deduplicateAddresses(detections: Detection[]): Detection[] {
    if (detections.length <= 1) {
      return detections;
    }
    
    const result: Detection[] = [];
    const used = new Set<number>();
    
    for (let i = 0; i < detections.length; i++) {
      if (used.has(i)) continue;
      
      const current = detections[i];
      let bestDetection = current;
      used.add(i);
      
      // Check for overlaps with other detections on the same page
      for (let j = i + 1; j < detections.length; j++) {
        if (used.has(j)) continue;
        
        const other = detections[j];
        
        // Only compare detections on the same page
        if (current.pageNumber !== other.pageNumber) continue;
        
        // Check if bounding boxes overlap significantly
        const overlapArea = this.calculateOverlapArea(current.bbox, other.bbox);
        const currentArea = current.bbox.width * current.bbox.height;
        const otherArea = other.bbox.width * other.bbox.height;
        
        // If overlap is more than 50% of either box, consider them duplicates
        if (overlapArea > currentArea * 0.5 || overlapArea > otherArea * 0.5) {
          used.add(j);
          
          // Keep the one with larger bounding box (more complete address)
          if (otherArea > currentArea) {
            bestDetection = other;
          }
        }
      }
      
      result.push(bestDetection);
    }
    
    return result;
  }

  /**
   * Calculate the overlapping area between two bounding boxes
   */
  private calculateOverlapArea(box1: BoundingBox, box2: BoundingBox): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
    
    if (x2 <= x1 || y2 <= y1) {
      return 0; // No overlap
    }
    
    return (x2 - x1) * (y2 - y1);
  }
}

// Export a singleton instance
let patternDetectorInstance: PatternDetector | null = null;

export function getPatternDetector(): PatternDetector {
  if (!patternDetectorInstance) {
    patternDetectorInstance = new PatternDetector();
  }
  return patternDetectorInstance;
}
