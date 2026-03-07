/**
 * Tag Normalization Types
 * 標籤標準化類型定義 - 抽取與標準化分離架構
 */

// Tag categories
export type TagCategory = 'industry' | 'location' | 'expertise' | 'seniority';

// Standard tag categories (enums for normalization, not for AI)
export const INDUSTRY_CATEGORIES = [
  '資訊服務',
  '資訊安全',
  '金融',
  '製造',
  '零售',
  '醫療',
  '教育',
  '政府',
  '電信',
  '其他'
] as const;

export const LOCATION_CATEGORIES = [
  '台北',
  '新北',
  '桃園',
  '台中',
  '台南',
  '高雄',
  '其他'
] as const;

export const SENIORITY_CATEGORIES = [
  '高階主管',
  '中階主管',
  '基層主管',
  '專業人員',
  '其他'
] as const;

export type IndustryCategory = typeof INDUSTRY_CATEGORIES[number];
export type LocationCategory = typeof LOCATION_CATEGORIES[number];
export type SeniorityCategory = typeof SENIORITY_CATEGORIES[number];

// AI extraction result (raw, no normalization)
export interface TagExtractionResult {
  card_index: number;
  industry?: string;      // AI 自由輸出
  location?: string;      // AI 自由輸出
  expertise?: string[];   // AI 自由輸出 (max 3)
  seniority?: string;     // AI 自由輸出
}

// Database schema (with normalization)
export interface CardTag {
  card_uuid: string;
  category: TagCategory;        // 類別（避免字串解析）
  tag: string;                  // 向後相容 (e.g., "industry:資訊服務")
  raw_value: string;            // AI 原始輸出 (e.g., "軟體與資訊服務業")
  normalized_value: string;     // 標準化值 (e.g., "資訊服務")
  tag_source: string;           // 'auto', 'auto-low-confidence', 'auto_keyword'
  created_at: number;
}

// Tag for API response
export interface TagResponse {
  category: TagCategory;
  raw: string;
  normalized: string;
}

// Tag stats (rebuildable cache)
export interface TagStats {
  user_email: string;
  tag: string;                  // category:normalized_value
  count: number;
  last_updated: number;
  rebuild_at: number | null;    // 快取重建時間戳
}
