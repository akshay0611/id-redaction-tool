import { describe, it, expect } from 'vitest';
import { PatternDetector } from '@/lib/patternDetector';
import { OCRResult } from '@/types';

describe('PatternDetector', () => {
  const detector = new PatternDetector();

  describe('detectPII', () => {
    it('should detect Aadhaar numbers in plain format', () => {
      const ocrResult: OCRResult = {
        pages: [{
          pageNumber: 1,
          width: 800,
          height: 600,
          textBlocks: [
            {
              text: 'Aadhaar: 123456789012',
              confidence: 0.95,
              bbox: { x: 10, y: 10, width: 200, height: 20 }
            }
          ]
        }],
        success: true
      };

      const result = detector.detectPII(ocrResult);
      
      expect(result.aadhaarNumbers).toHaveLength(1);
      expect(result.aadhaarNumbers[0].value).toBe('123456789012');
      expect(result.aadhaarNumbers[0].type).toBe('AADHAAR');
    });

    it('should detect Aadhaar numbers with spaces', () => {
      const ocrResult: OCRResult = {
        pages: [{
          pageNumber: 1,
          width: 800,
          height: 600,
          textBlocks: [
            {
              text: 'Aadhaar: 1234 5678 9012',
              confidence: 0.95,
              bbox: { x: 10, y: 10, width: 200, height: 20 }
            }
          ]
        }],
        success: true
      };

      const result = detector.detectPII(ocrResult);
      
      expect(result.aadhaarNumbers).toHaveLength(1);
      expect(result.aadhaarNumbers[0].value).toBe('1234 5678 9012');
    });

    it('should detect PAN numbers', () => {
      const ocrResult: OCRResult = {
        pages: [{
          pageNumber: 1,
          width: 800,
          height: 600,
          textBlocks: [
            {
              text: 'PAN: ABCDE1234F',
              confidence: 0.95,
              bbox: { x: 10, y: 10, width: 200, height: 20 }
            }
          ]
        }],
        success: true
      };

      const result = detector.detectPII(ocrResult);
      
      expect(result.panNumbers).toHaveLength(1);
      expect(result.panNumbers[0].value).toBe('ABCDE1234F');
      expect(result.panNumbers[0].type).toBe('PAN');
    });

    it('should detect phone numbers', () => {
      const ocrResult: OCRResult = {
        pages: [{
          pageNumber: 1,
          width: 800,
          height: 600,
          textBlocks: [
            {
              text: 'Phone: 9876543210',
              confidence: 0.95,
              bbox: { x: 10, y: 10, width: 200, height: 20 }
            }
          ]
        }],
        success: true
      };

      const result = detector.detectPII(ocrResult);
      
      expect(result.phoneNumbers).toHaveLength(1);
      expect(result.phoneNumbers[0].value).toBe('9876543210');
      expect(result.phoneNumbers[0].type).toBe('PHONE');
    });

    it('should detect addresses with PIN codes', () => {
      const ocrResult: OCRResult = {
        pages: [{
          pageNumber: 1,
          width: 800,
          height: 600,
          textBlocks: [
            {
              text: '123 Main Street',
              confidence: 0.95,
              bbox: { x: 10, y: 10, width: 200, height: 20 }
            },
            {
              text: 'City Name',
              confidence: 0.95,
              bbox: { x: 10, y: 35, width: 200, height: 20 }
            },
            {
              text: 'PIN: 560001',
              confidence: 0.95,
              bbox: { x: 10, y: 60, width: 200, height: 20 }
            }
          ]
        }],
        success: true
      };

      const result = detector.detectPII(ocrResult);
      
      expect(result.addresses.length).toBeGreaterThan(0);
      expect(result.addresses[0].type).toBe('ADDRESS');
      expect(result.addresses[0].value).toContain('560001');
    });

    it('should return empty arrays when no PII is detected', () => {
      const ocrResult: OCRResult = {
        pages: [{
          pageNumber: 1,
          width: 800,
          height: 600,
          textBlocks: [
            {
              text: 'This is just regular text',
              confidence: 0.95,
              bbox: { x: 10, y: 10, width: 200, height: 20 }
            }
          ]
        }],
        success: true
      };

      const result = detector.detectPII(ocrResult);
      
      expect(result.aadhaarNumbers).toHaveLength(0);
      expect(result.panNumbers).toHaveLength(0);
      expect(result.phoneNumbers).toHaveLength(0);
      expect(result.addresses).toHaveLength(0);
    });
  });
});
