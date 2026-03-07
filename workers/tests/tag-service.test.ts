import { describe, it, expect } from 'vitest';
import { normalizeTag } from '../src/services/tag-service';

describe('Tag Normalization', () => {
  describe('Industry normalization', () => {
    it('should normalize "軟體與資訊服務業" to "資訊服務"', () => {
      expect(normalizeTag('industry', '軟體與資訊服務業')).toBe('資訊服務');
    });

    it('should normalize "資訊服務業" to "資訊服務"', () => {
      expect(normalizeTag('industry', '資訊服務業')).toBe('資訊服務');
    });

    it('should normalize "資安" to "資訊安全"', () => {
      expect(normalizeTag('industry', '資安')).toBe('資訊安全');
    });

    it('should keep standard category as-is', () => {
      expect(normalizeTag('industry', '資訊服務')).toBe('資訊服務');
    });

    it('should return "其他" for unknown industry', () => {
      expect(normalizeTag('industry', '未知產業')).toBe('其他');
    });
  });

  describe('Location normalization', () => {
    it('should normalize "台北市內湖區" to "台北"', () => {
      expect(normalizeTag('location', '台北市內湖區')).toBe('台北');
    });

    it('should normalize "台北市" to "台北"', () => {
      expect(normalizeTag('location', '台北市')).toBe('台北');
    });

    it('should return "其他" for unknown location', () => {
      expect(normalizeTag('location', '未知地點')).toBe('其他');
    });
  });

  describe('Expertise preservation', () => {
    it('should not normalize expertise', () => {
      expect(normalizeTag('expertise', '雲端架構')).toBe('雲端架構');
      expect(normalizeTag('expertise', 'DevOps')).toBe('DevOps');
    });
  });

  describe('Seniority normalization', () => {
    it('should normalize "資深副總經理" to "高階主管"', () => {
      expect(normalizeTag('seniority', '資深副總經理')).toBe('高階主管');
    });

    it('should normalize "經理" to "中階主管"', () => {
      expect(normalizeTag('seniority', '經理')).toBe('中階主管');
    });
  });
});
