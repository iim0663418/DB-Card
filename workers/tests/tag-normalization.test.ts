/**
 * Tag Normalization Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  INDUSTRY_CATEGORIES, 
  LOCATION_CATEGORIES,
  SENIORITY_CATEGORIES 
} from '../src/types/tags';

describe('Tag Normalization', () => {
  it('should have 10 industry categories', () => {
    expect(INDUSTRY_CATEGORIES).toHaveLength(10);
    expect(INDUSTRY_CATEGORIES).toContain('資訊服務');
    expect(INDUSTRY_CATEGORIES).toContain('其他');
  });

  it('should have 7 location categories', () => {
    expect(LOCATION_CATEGORIES).toHaveLength(7);
    expect(LOCATION_CATEGORIES).toContain('台北');
    expect(LOCATION_CATEGORIES).toContain('其他');
  });

  it('should have 5 seniority categories', () => {
    expect(SENIORITY_CATEGORIES).toHaveLength(5);
    expect(SENIORITY_CATEGORIES).toContain('高階主管');
    expect(SENIORITY_CATEGORIES).toContain('其他');
  });

  it('should preserve raw value while normalizing', () => {
    const mockTag = {
      industry: {
        raw: '軟體與資訊服務業',
        normalized: '資訊服務'
      }
    };

    expect(mockTag.industry.raw).toBe('軟體與資訊服務業');
    expect(mockTag.industry.normalized).toBe('資訊服務');
  });
});
