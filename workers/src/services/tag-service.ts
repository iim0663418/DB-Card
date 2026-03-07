/**
 * Unified Tag Service
 * 統一標籤寫入服務 - 所有 cron/batch 共用
 */

import type { Env } from '../types';
import type { TagCategory, TagExtractionResult } from '../types/tags';
import { 
  INDUSTRY_CATEGORIES, 
  LOCATION_CATEGORIES, 
  SENIORITY_CATEGORIES 
} from '../types/tags';

/**
 * Normalize raw tag value to standard category
 * 標準化函式 - 獨立於 AI 抽取
 */
export function normalizeTag(category: TagCategory, rawValue: string): string {
  const normalized = rawValue.trim();

  switch (category) {
    case 'industry':
      return normalizeIndustry(normalized);
    case 'location':
      return normalizeLocation(normalized);
    case 'seniority':
      return normalizeSeniority(normalized);
    case 'expertise':
      return normalized; // 不標準化，保留活性
    default:
      return normalized;
  }
}

function normalizeIndustry(raw: string): string {
  // 映射規則（可擴展）
  const mappings: Record<string, string> = {
    '資訊服務業': '資訊服務',
    '軟體與資訊服務業': '資訊服務',
    '軟體業': '資訊服務',
    '資訊軟體': '資訊服務',
    '資安': '資訊安全',
    'Information Security': '資訊安全',
    'Cybersecurity': '資訊安全',
    '電信與科技': '電信',
    '電信與資訊技術': '電信',
  };

  const mapped = mappings[raw];
  if (mapped) return mapped;

  // 檢查是否在標準列表中
  if (INDUSTRY_CATEGORIES.includes(raw as any)) {
    return raw;
  }

  // 模糊匹配（包含關鍵字）
  for (const category of INDUSTRY_CATEGORIES) {
    if (raw.includes(category) || category.includes(raw)) {
      return category;
    }
  }

  return '其他';
}

function normalizeLocation(raw: string): string {
  // 提取城市名稱
  const cityMappings: Record<string, string> = {
    '台北市': '台北',
    '新北市': '新北',
    '桃園市': '桃園',
    '台中市': '台中',
    '台南市': '台南',
    '高雄市': '高雄',
    'Taipei': '台北',
    'Taiwan': '其他',
  };

  const mapped = cityMappings[raw];
  if (mapped) return mapped;

  // 檢查是否包含城市名
  for (const city of LOCATION_CATEGORIES) {
    if (raw.includes(city)) {
      return city;
    }
  }

  return '其他';
}

function normalizeSeniority(raw: string): string {
  // 職級映射
  const mappings: Record<string, string> = {
    'CEO': '高階主管',
    'CTO': '高階主管',
    'CFO': '高階主管',
    'VP': '高階主管',
    '總經理': '高階主管',
    '副總經理': '高階主管',
    '資深副總經理': '高階主管',
    'Director': '中階主管',
    '經理': '中階主管',
    'Manager': '基層主管',
    '組長': '基層主管',
    'Engineer': '專業人員',
    'Specialist': '專業人員',
    'Consultant': '專業人員',
  };

  const mapped = mappings[raw];
  if (mapped) return mapped;

  // 模糊匹配
  if (raw.includes('總') || raw.includes('長')) return '高階主管';
  if (raw.includes('經理')) return '中階主管';
  if (raw.includes('組長') || raw.includes('主管')) return '基層主管';

  return '其他';
}

/**
 * Save tags to database (unified entry point)
 * 統一寫入入口 - 處理標準化、去重、統計
 */
export async function saveTags(
  env: Env,
  cardUuid: string,
  userEmail: string,
  tags: TagExtractionResult
): Promise<void> {
  const now = Date.now();
  const entries: Array<{
    category: TagCategory;
    raw: string;
    normalized: string;
    source: string;
  }> = [];

  // Industry (高信心度)
  if (tags.industry) {
    entries.push({
      category: 'industry',
      raw: tags.industry,
      normalized: normalizeTag('industry', tags.industry),
      source: 'auto'
    });
  }

  // Location (高信心度)
  if (tags.location) {
    entries.push({
      category: 'location',
      raw: tags.location,
      normalized: normalizeTag('location', tags.location),
      source: 'auto'
    });
  }

  // Expertise (低信心度，不標準化)
  if (tags.expertise && tags.expertise.length > 0) {
    for (const exp of tags.expertise.slice(0, 3)) {
      entries.push({
        category: 'expertise',
        raw: exp,
        normalized: exp,
        source: 'auto-low-confidence'
      });
    }
  }

  // Seniority (低信心度)
  if (tags.seniority) {
    entries.push({
      category: 'seniority',
      raw: tags.seniority,
      normalized: normalizeTag('seniority', tags.seniority),
      source: 'auto-low-confidence'
    });
  }

  // 批次寫入（使用 INSERT OR REPLACE 避免重複）
  for (const entry of entries) {
    const tag = `${entry.category}:${entry.normalized}`;

    await env.DB.prepare(`
      INSERT OR REPLACE INTO card_tags (
        card_uuid, category, tag, raw_value, normalized_value, tag_source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      cardUuid,
      entry.category,
      tag,
      entry.raw,
      entry.normalized,
      entry.source,
      now
    ).run();
  }

  // 標記 tag_stats 需要重建（不做 count+1）
  await env.DB.prepare(`
    UPDATE tag_stats 
    SET rebuild_at = NULL 
    WHERE user_email = ?
  `).bind(userEmail).run();
}

/**
 * Rebuild tag_stats for a user (rebuildable cache)
 * 重建標籤統計 - 從 card_tags 重新計算
 */
export async function rebuildTagStats(env: Env, userEmail: string): Promise<void> {
  const now = Date.now();

  // 刪除舊統計
  await env.DB.prepare(`
    DELETE FROM tag_stats WHERE user_email = ?
  `).bind(userEmail).run();

  // 重新計算
  await env.DB.prepare(`
    INSERT INTO tag_stats (user_email, tag, count, last_updated, rebuild_at)
    SELECT 
      ?, 
      category || ':' || normalized_value as tag,
      COUNT(*) as count,
      ? as last_updated,
      ? as rebuild_at
    FROM card_tags ct
    JOIN received_cards rc ON ct.card_uuid = rc.uuid
    WHERE rc.user_email = ?
      AND rc.deleted_at IS NULL
      AND rc.merged_to IS NULL
    GROUP BY category, normalized_value
  `).bind(userEmail, now, now, userEmail).run();
}

/**
 * Rebuild tag_stats for all users (cron job)
 */
export async function rebuildAllTagStats(env: Env): Promise<{ rebuilt: number }> {
  // 查詢所有需要重建的用戶
  const { results: users } = await env.DB.prepare(`
    SELECT DISTINCT user_email 
    FROM tag_stats 
    WHERE rebuild_at IS NULL
  `).all();

  for (const user of users) {
    await rebuildTagStats(env, (user as any).user_email);
  }

  return { rebuilt: users.length };
}
