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
   * Also detects VID (Virtual ID) numbers which are 16 digits
   */
  private detectAadhaar(ocrResult: OCRResult): Detection[] {
    const detections: Detection[] = [];

    // Regex patterns for different Aadhaar formats
    const aadhaarPatterns = [
      /\b\d{12}\b/g,                           // Plain format: 12 consecutive digits
      /\b\d{4}\s\d{4}\s\d{4}\b/g,             // Space-separated: XXXX XXXX XXXX
      /\b\d{4}-\d{4}-\d{4}\b/g,               // Hyphen-separated: XXXX-XXXX-XXXX
      /\b\d{4}\s?\d{4}\s?\d{4}\b/g,           // Optional spaces
      /\b\d{16}\b/g,                          // VID format: 16 digits
      /\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b/g,     // VID with spaces
    ];

    for (const page of ocrResult.pages) {
      // Build full text from all text blocks for pattern matching
      const fullText = page.textBlocks.map(block => block.text).join(' ');

      // Track detected numbers to avoid duplicates
      const detectedNumbers = new Set<string>();

      // Try each pattern
      for (const pattern of aadhaarPatterns) {
        const matches = Array.from(fullText.matchAll(pattern));

        for (const match of matches) {
          if (match.index === undefined) continue;

          const matchedText = match[0];
          const digitsOnly = matchedText.replace(/\D/g, '');

          // Skip if already detected
          if (detectedNumbers.has(digitsOnly)) continue;

          // Validate: Aadhaar is 12 digits, VID is 16 digits
          if (digitsOnly.length === 12 || digitsOnly.length === 16) {
            detectedNumbers.add(digitsOnly);

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
                confidence: 0.9,
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
   * Enhanced with case-insensitive matching and fuzzy matching for OCR errors
   */
  private detectPAN(ocrResult: OCRResult): Detection[] {
    const detections: Detection[] = [];

    // PAN format: 5 letters, 4 digits, 1 letter (case-insensitive)
    const panPattern = /\b[A-Za-z]{5}\d{4}[A-Za-z]\b/gi;

    for (const page of ocrResult.pages) {
      // Build full text from all text blocks for pattern matching
      const fullText = page.textBlocks.map(block => block.text).join(' ');

      // First pass: exact pattern matching (case-insensitive)
      const matches = Array.from(fullText.matchAll(panPattern));

      for (const match of matches) {
        if (match.index === undefined) continue;

        const matchedText = match[0];
        const normalizedPAN = this.normalizePAN(matchedText);

        // Validate PAN format after normalization
        if (this.isValidPANFormat(normalizedPAN)) {
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
              value: normalizedPAN.toUpperCase(),
              confidence: 0.9,
              bbox,
              pageNumber: page.pageNumber,
            });
          }
        }
      }

      // Second pass: fuzzy matching for OCR errors
      // Look for patterns that might be PAN with common OCR mistakes
      const fuzzyPANs = this.findFuzzyPANMatches(fullText, page.textBlocks, page.pageNumber);
      detections.push(...fuzzyPANs);

      // Third pass: very aggressive matching for edge cases (watermarks, noise, etc.)
      const aggressivePANs = this.findAggressivePANMatches(fullText, page.textBlocks, page.pageNumber);
      detections.push(...aggressivePANs);
    }

    // Remove duplicates
    return this.deduplicatePANDetections(detections);
  }

  /**
   * Normalize PAN text by fixing common OCR errors
   */
  private normalizePAN(text: string): string {
    let normalized = text.toUpperCase().trim();

    // Remove common noise characters
    normalized = normalized.replace(/[^A-Z0-9]/g, '');

    // Common OCR mistakes in PAN numbers:
    // O (letter) vs 0 (zero) - in digit positions should be 0
    // I (letter) vs 1 (one) - in digit positions should be 1
    // S vs 5, Z vs 2, etc.

    // Split into parts: 5 letters, 4 digits, 1 letter
    if (normalized.length === 10) {
      const part1 = normalized.substring(0, 5); // First 5 letters
      const part2 = normalized.substring(5, 9); // 4 digits
      const part3 = normalized.substring(9, 10); // Last letter

      // Fix digit section (positions 5-8)
      let fixedDigits = part2
        .replace(/O/g, '0')
        .replace(/I/g, '1')
        .replace(/Z/g, '2')
        .replace(/S/g, '5')
        .replace(/B/g, '8')
        .replace(/G/g, '6')
        .replace(/T/g, '7');

      normalized = part1 + fixedDigits + part3;
    }

    return normalized;
  }

  /**
   * Validate if normalized text matches PAN format
   */
  private isValidPANFormat(text: string): boolean {
    // PAN format: 5 letters, 4 digits, 1 letter
    const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
    return panRegex.test(text);
  }

  /**
   * Find potential PAN numbers with fuzzy matching for OCR errors
   */
  private findFuzzyPANMatches(
    fullText: string,
    textBlocks: TextBlock[],
    pageNumber: number
  ): Detection[] {
    const detections: Detection[] = [];

    // Look for 10-character sequences that might be PAN
    // More lenient pattern: any mix of letters and digits
    const fuzzyPattern = /\b[A-Za-z0-9]{10}\b/gi;
    const matches = Array.from(fullText.matchAll(fuzzyPattern));

    for (const match of matches) {
      if (match.index === undefined) continue;

      const matchedText = match[0];
      const normalized = this.normalizePAN(matchedText);

      // Check if after normalization it looks like a valid PAN
      if (this.isValidPANFormat(normalized)) {
        // Additional check: first 3 letters should be alphabetic
        const firstThree = normalized.substring(0, 3);
        if (/^[A-Z]{3}$/.test(firstThree)) {
          const bbox = this.findBoundingBoxForMatch(
            matchedText,
            match.index,
            textBlocks,
            fullText
          );

          if (bbox) {
            detections.push({
              type: 'PAN',
              value: normalized,
              confidence: 0.75, // Lower confidence for fuzzy matches
              bbox,
              pageNumber,
            });
          }
        }
      }
    }

    return detections;
  }

  /**
   * Very aggressive PAN matching for edge cases like watermarks, noise, etc.
   * This method splits text and checks individual words more carefully
   */
  private findAggressivePANMatches(
    fullText: string,
    textBlocks: TextBlock[],
    pageNumber: number
  ): Detection[] {
    const detections: Detection[] = [];

    // Split text into individual words and check each
    const words = fullText.split(/\s+/);
    let currentIndex = 0;

    for (const word of words) {
      // Clean the word of special characters
      const cleaned = word.replace(/[^A-Za-z0-9]/g, '');

      // Check if it could be a PAN (10 characters)
      if (cleaned.length >= 10 && cleaned.length <= 12) {
        // Try to extract 10-character substring
        for (let i = 0; i <= cleaned.length - 10; i++) {
          const candidate = cleaned.substring(i, i + 10);
          const normalized = this.normalizePAN(candidate);

          if (this.isValidPANFormat(normalized)) {
            // Find this word in the full text
            const wordIndex = fullText.indexOf(word, currentIndex);
            if (wordIndex !== -1) {
              const bbox = this.findBoundingBoxForMatch(
                word,
                wordIndex,
                textBlocks,
                fullText
              );

              if (bbox) {
                detections.push({
                  type: 'PAN',
                  value: normalized,
                  confidence: 0.65, // Even lower confidence for aggressive matches
                  bbox,
                  pageNumber,
                });
              }
            }
            break; // Found a match in this word, move to next word
          }
        }
      }

      currentIndex += word.length + 1; // +1 for space
    }

    return detections;
  }

  /**
   * Remove duplicate PAN detections
   */
  private deduplicatePANDetections(detections: Detection[]): Detection[] {
    if (detections.length <= 1) return detections;

    const seen = new Map<string, Detection>();

    for (const detection of detections) {
      const key = `${detection.pageNumber}-${detection.value}`;

      if (!seen.has(key)) {
        seen.set(key, detection);
      } else {
        // Keep the one with higher confidence
        const existing = seen.get(key)!;
        if (detection.confidence > existing.confidence) {
          seen.set(key, detection);
        }
      }
    }

    return Array.from(seen.values());
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
