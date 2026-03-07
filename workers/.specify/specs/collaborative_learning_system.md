# 協同學習系統完整規劃
# Collaborative Learning System - Complete Specification

**版本**: v1.0.0  
**日期**: 2026-03-04  
**狀態**: 規劃階段 (Planning)

---

## 執行摘要 (Executive Summary)

### 願景 (Vision)
建立一個**跨使用者協同學習系統**，透過使用者之間的行為，自動維持名片資訊的常新狀態。

### 核心價值 (Core Value)
- 🌐 **協同知識庫** - 所有使用者共同維護，資訊品質持續提升
- 🔄 **資訊常新** - 自動同步最新狀態，無需手動更新
- 🤝 **網絡效應** - 使用者越多，價值越大
- 🎯 **零維護成本** - 使用者行為自動更新，無需人工介入

### 關鍵機制 (Key Mechanisms)
1. **跨使用者身份識別** - FileSearchStore + Gemini AI 判斷同一人
2. **資訊同步策略** - 職位變動、聯絡方式更新、公司資訊補充
3. **錯誤回報處理** - 使用者回報 → 立即回滾 → 系統學習
4. **品質監控** - 錯誤率追蹤、信譽系統、匹配演算法優化

---

## 目錄 (Table of Contents)

1. [系統架構](#1-系統架構)
2. [資料庫設計](#2-資料庫設計)
3. [核心流程](#3-核心流程)
4. [錯誤處理](#4-錯誤處理)
5. [隱私與安全](#5-隱私與安全)
6. [使用者體驗](#6-使用者體驗)
7. [實施路徑](#7-實施路徑)
8. [風險評估](#8-風險評估)
9. [成本效益分析](#9-成本效益分析)
10. [監控指標](#10-監控指標)

---

## 1. 系統架構

### 1.1 整體架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                    使用者層 (User Layer)                     │
├─────────────────────────────────────────────────────────────┤
│  使用者 A          使用者 B          使用者 C               │
│  上傳名片          上傳名片          上傳名片               │
│     ↓                 ↓                 ↓                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  API 層 (API Layer)                          │
├─────────────────────────────────────────────────────────────┤
│  POST /api/user/received-cards (上傳名片)                   │
│  GET  /api/user/received-cards (列表查詢)                   │
│  POST /api/user/error-report   (錯誤回報)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              協同學習引擎 (Collaborative Engine)             │
├─────────────────────────────────────────────────────────────┤
│  1. 跨使用者匹配 (Cross-User Matching)                      │
│     - FileSearchStore 查詢                                   │
│     - Gemini AI 身份驗證                                     │
│     - 信心度評分 (0.85-1.00)                                │
│                                                              │
│  2. 資訊同步 (Information Sync)                              │
│     - 職位變動更新                                           │
│     - 聯絡方式更新                                           │
│     - 公司資訊補充                                           │
│                                                              │
│  3. 品質控制 (Quality Control)                               │
│     - 錯誤回報處理                                           │
│     - 匹配黑名單                                             │
│     - 演算法優化                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  資料層 (Data Layer)                         │
├─────────────────────────────────────────────────────────────┤
│  D1 Database          FileSearchStore        Vectorize      │
│  - received_cards     - 知識庫               - Embeddings   │
│  - cross_user_matches - 協同資料             - 語意搜尋     │
│  - error_reports      - 學習樣本                             │
│  - user_reputation                                           │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心元件 (Core Components)

#### A. 跨使用者匹配引擎 (Cross-User Matching Engine)
**職責**: 識別不同使用者上傳的相同人物名片

**輸入**:
- 新上傳的名片 (Card B, User B)
- FileSearchStore 歷史資料

**輸出**:
- 匹配結果列表 (Card A, User A, Confidence)

**演算法**:
```typescript
function calculateMatchConfidence(cardA, cardB): number {
  let score = 0;
  
  // 1. Email 完全相同 → 100%
  if (cardA.email === cardB.email) return 1.00;
  
  // 2. 電話完全相同 → 95%
  if (cardA.phone === cardB.phone) return 0.95;
  
  // 3. 姓名 + 組織相似度
  const nameSim = calculateNameSimilarity(cardA.full_name, cardB.full_name);
  const orgSim = calculateOrgSimilarity(cardA.organization, cardB.organization);
  
  // 4. FileSearchStore 上下文增強
  const contextScore = await queryFileSearchStore(cardA, cardB);
  
  // 5. 加權計算
  score = nameSim * 0.4 + orgSim * 0.3 + contextScore * 0.3;
  
  return score;
}
```

#### B. 資訊同步引擎 (Information Sync Engine)
**職責**: 根據匹配結果，更新舊名片資訊

**更新類型**:
1. **職位變動** (Job Change)
2. **聯絡方式更新** (Contact Update)
3. **公司資訊補充** (Company Info Enrichment)

**更新策略**:
```typescript
function determineUpdateType(cardA, cardB): UpdateType {
  // 1. 組織不同 → 轉職
  if (cardA.organization !== cardB.organization) {
    return 'job_change';
  }
  
  // 2. 職位不同 → 晉升
  if (cardA.title !== cardB.title) {
    return 'promotion';
  }
  
  // 3. 聯絡方式不同 → 聯絡方式更新
  if (cardA.email !== cardB.email || cardA.phone !== cardB.phone) {
    return 'contact_update';
  }
  
  // 4. 資訊補充
  if (!cardA.company_summary && cardB.company_summary) {
    return 'info_enrichment';
  }
  
  return 'no_update';
}
```

#### C. 品質控制引擎 (Quality Control Engine)
**職責**: 處理錯誤回報，優化匹配演算法

**核心功能**:
1. 錯誤回報處理 (立即回滾)
2. 匹配黑名單管理
3. 演算法參數調整
4. 使用者信譽系統

---

## 1.3 資料流向 (Data Flow)

### 場景 1: 新名片上傳觸發協同更新

```
使用者 B 上傳新名片
    ↓
1. 儲存到 received_cards
    ↓
2. 上傳到 FileSearchStore (背景)
    ↓
3. 觸發 Cron Job: crossUserSync()
    ↓
4. 查詢 FileSearchStore: 是否有相似名片？
    ↓
5. 找到使用者 A 的舊名片 (confidence > 0.85)
    ↓
6. 判斷更新類型 (job_change / contact_update / enrichment)
    ↓
7. 更新使用者 A 的名片
    ↓
8. 記錄到 cross_user_matches
    ↓
9. 通知使用者 A (選用)
```

### 場景 2: 使用者回報錯誤

```
使用者 A 收到更新通知
    ↓
點擊 [回報錯誤]
    ↓
1. 記錄到 error_reports
    ↓
2. 立即回滾更新 (rollbackUpdate)
    ↓
3. 標記 cross_user_matches.disputed = 1
    ↓
4. 加入 matching_blacklist (防止重複)
    ↓
5. 背景分析錯誤 (analyzeErrorReport)
    ↓
6. 調整匹配演算法參數
    ↓
7. 更新使用者信譽 (user_reputation)
```

---

## 1.4 技術棧 (Technology Stack)

| 層級 | 技術 | 用途 |
|------|------|------|
| **運算** | Cloudflare Workers | 無伺服器運算 |
| **資料庫** | D1 (SQLite) | 結構化資料儲存 |
| **知識庫** | FileSearchStore | 協同知識累積 |
| **向量搜尋** | Vectorize | 語意相似度匹配 |
| **AI** | Gemini 2.0 Flash | 身份驗證、資訊提取 |
| **排程** | Cron Triggers | 每日協同同步 |
| **儲存** | R2 | 名片圖片儲存 |

---

## 1.5 效能指標 (Performance Targets)

| 指標 | 目標值 | 監控方式 |
|------|--------|---------|
| 匹配準確率 | > 90% | 錯誤回報率 < 10% |
| 匹配延遲 | < 24 小時 | Cron Job 執行時間 |
| 更新接受率 | > 70% | 使用者點擊「確認」比例 |
| 系統可用性 | > 99.9% | Workers Analytics |
| API 回應時間 | < 200ms | P95 延遲 |

---

## 1.6 擴展性設計 (Scalability)

### 水平擴展 (Horizontal Scaling)
- ✅ Cloudflare Workers 自動擴展
- ✅ D1 Database 分散式架構
- ✅ FileSearchStore 雲端服務

### 垂直優化 (Vertical Optimization)
- 批次處理 (Batch Processing): 每次處理 100 張名片
- 快取策略 (Caching): KV 快取匹配結果 (1 小時)
- 索引優化 (Indexing): 複合索引加速查詢

### 容量規劃 (Capacity Planning)

| 使用者數 | 名片數 | 每日匹配數 | 預估成本 |
|---------|--------|-----------|---------|
| 100 | 5,000 | 50 | $5/月 |
| 1,000 | 50,000 | 500 | $50/月 |
| 10,000 | 500,000 | 5,000 | $500/月 |

---

## 下一節預覽

接下來將詳細說明：
- 資料庫設計 (Schema, Indexes, Migrations)
- 核心流程 (API, Cron Jobs, Algorithms)
- 錯誤處理 (Error Reporting, Quality Control)
- 隱私與安全 (Privacy, Security, Compliance)

**繼續閱讀**: [2. 資料庫設計](#2-資料庫設計)


---

## 2. 資料庫設計

### 2.1 Schema 總覽

```sql
-- 現有表格 (Existing Tables)
received_cards          -- 名片主表
card_tags              -- 標籤
shared_cards           -- 分享

-- 新增表格 (New Tables for Collaborative Learning)
cross_user_matches     -- 跨使用者匹配記錄
error_reports          -- 錯誤回報
matching_blacklist     -- 匹配黑名單
user_reputation        -- 使用者信譽
quality_metrics        -- 品質指標
contact_history        -- 聯絡方式歷史
```

### 2.2 核心表格設計

#### A. cross_user_matches (跨使用者匹配記錄)

```sql
CREATE TABLE cross_user_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 匹配的兩張名片
  card_a_uuid TEXT NOT NULL,
  card_a_user TEXT NOT NULL,
  card_b_uuid TEXT NOT NULL,
  card_b_user TEXT NOT NULL,
  
  -- 匹配資訊
  match_confidence INTEGER NOT NULL,  -- 85-100
  match_reason TEXT,                  -- 'email_match' | 'phone_match' | 'context_match'
  matched_at INTEGER NOT NULL,
  
  -- 更新資訊
  update_type TEXT,                   -- 'job_change' | 'contact_update' | 'enrichment'
  action_taken TEXT,                  -- 'updated' | 'notified' | 'ignored'
  
  -- 品質控制
  disputed INTEGER DEFAULT 0,         -- 0 = 正常, 1 = 有爭議
  dispute_count INTEGER DEFAULT 0,
  
  -- 外鍵
  FOREIGN KEY (card_a_uuid) REFERENCES received_cards(uuid),
  FOREIGN KEY (card_b_uuid) REFERENCES received_cards(uuid)
);

CREATE INDEX idx_cross_user_matches_card_a ON cross_user_matches(card_a_uuid);
CREATE INDEX idx_cross_user_matches_card_b ON cross_user_matches(card_b_uuid);
CREATE INDEX idx_cross_user_matches_disputed ON cross_user_matches(disputed);
CREATE INDEX idx_cross_user_matches_matched_at ON cross_user_matches(matched_at);
```

#### B. error_reports (錯誤回報)

```sql
CREATE TABLE error_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 回報資訊
  card_uuid TEXT NOT NULL,
  update_id INTEGER NOT NULL,
  error_type TEXT NOT NULL,           -- 'wrong_person' | 'wrong_info' | 'outdated' | 'other'
  description TEXT,
  
  -- 回報者
  reported_at INTEGER NOT NULL,
  reported_by TEXT NOT NULL,
  
  -- 處理狀態
  status TEXT DEFAULT 'pending',      -- 'pending' | 'analyzed' | 'resolved'
  analyzed_at INTEGER,
  resolution TEXT,
  
  -- 外鍵
  FOREIGN KEY (card_uuid) REFERENCES received_cards(uuid),
  FOREIGN KEY (update_id) REFERENCES cross_user_matches(id)
);

CREATE INDEX idx_error_reports_card ON error_reports(card_uuid);
CREATE INDEX idx_error_reports_status ON error_reports(status);
CREATE INDEX idx_error_reports_reported_by ON error_reports(reported_by);
CREATE INDEX idx_error_reports_update_id ON error_reports(update_id);
```

#### C. matching_blacklist (匹配黑名單)

```sql
CREATE TABLE matching_blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 黑名單配對
  card_a_uuid TEXT NOT NULL,
  card_b_uuid TEXT NOT NULL,
  
  -- 原因與時效
  reason TEXT NOT NULL,               -- 'user_reported' | 'low_quality' | 'conflict'
  created_at INTEGER NOT NULL,
  expires_at INTEGER,                 -- NULL = 永久
  
  -- 唯一約束
  UNIQUE(card_a_uuid, card_b_uuid)
);

CREATE INDEX idx_matching_blacklist_card_a ON matching_blacklist(card_a_uuid);
CREATE INDEX idx_matching_blacklist_card_b ON matching_blacklist(card_b_uuid);
CREATE INDEX idx_matching_blacklist_expires ON matching_blacklist(expires_at);
```

#### D. user_reputation (使用者信譽)

```sql
CREATE TABLE user_reputation (
  user_email TEXT PRIMARY KEY,
  
  -- 回報統計
  correct_reports INTEGER DEFAULT 0,     -- 回報後確認正確
  incorrect_reports INTEGER DEFAULT 0,   -- 回報後發現錯誤
  total_reports INTEGER DEFAULT 0,
  
  -- 更新統計
  updates_received INTEGER DEFAULT 0,    -- 收到的更新數
  updates_accepted INTEGER DEFAULT 0,    -- 接受的更新數
  updates_rejected INTEGER DEFAULT 0,    -- 拒絕的更新數
  
  -- 信譽分數
  reputation_score INTEGER DEFAULT 50,   -- 0-100
  last_updated INTEGER NOT NULL
);

CREATE INDEX idx_user_reputation_score ON user_reputation(reputation_score);
```

#### E. contact_history (聯絡方式歷史)

```sql
CREATE TABLE contact_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 關聯名片
  card_uuid TEXT NOT NULL,
  
  -- 聯絡方式
  phone TEXT,
  email TEXT,
  
  -- 時效
  valid_from INTEGER NOT NULL,
  valid_until INTEGER,                -- NULL = 目前有效
  
  -- 來源
  source TEXT,                        -- 'original' | 'community_update'
  source_user TEXT,                   -- 提供此資訊的使用者
  
  -- 外鍵
  FOREIGN KEY (card_uuid) REFERENCES received_cards(uuid)
);

CREATE INDEX idx_contact_history_card ON contact_history(card_uuid);
CREATE INDEX idx_contact_history_valid ON contact_history(valid_until);
```

#### F. quality_metrics (品質指標)

```sql
CREATE TABLE quality_metrics (
  date TEXT PRIMARY KEY,              -- YYYY-MM-DD
  
  -- 更新統計
  total_updates INTEGER DEFAULT 0,
  accepted_updates INTEGER DEFAULT 0,
  reported_errors INTEGER DEFAULT 0,
  
  -- 錯誤率
  error_rate REAL DEFAULT 0,          -- reported / total
  
  -- 信心度分佈
  confidence_85_90 INTEGER DEFAULT 0,
  confidence_90_95 INTEGER DEFAULT 0,
  confidence_95_100 INTEGER DEFAULT 0,
  
  -- 平均值
  avg_confidence REAL DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0
);

CREATE INDEX idx_quality_metrics_date ON quality_metrics(date);
```

### 2.3 received_cards 擴充欄位

```sql
-- Migration 0036: Collaborative Learning Extensions

ALTER TABLE received_cards ADD COLUMN updated_by_community INTEGER DEFAULT 0;
ALTER TABLE received_cards ADD COLUMN last_community_update INTEGER;
ALTER TABLE received_cards ADD COLUMN community_update_count INTEGER DEFAULT 0;
ALTER TABLE received_cards ADD COLUMN job_history TEXT;  -- JSON array

-- 索引
CREATE INDEX idx_received_cards_community_updated ON received_cards(updated_by_community);
CREATE INDEX idx_received_cards_last_update ON received_cards(last_community_update);
```

### 2.4 Migration 腳本

```sql
-- migrations/0036_collaborative_learning.sql

-- 1. 跨使用者匹配記錄
CREATE TABLE cross_user_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_a_uuid TEXT NOT NULL,
  card_a_user TEXT NOT NULL,
  card_b_uuid TEXT NOT NULL,
  card_b_user TEXT NOT NULL,
  match_confidence INTEGER NOT NULL,
  match_reason TEXT,
  matched_at INTEGER NOT NULL,
  update_type TEXT,
  action_taken TEXT,
  disputed INTEGER DEFAULT 0,
  dispute_count INTEGER DEFAULT 0,
  FOREIGN KEY (card_a_uuid) REFERENCES received_cards(uuid),
  FOREIGN KEY (card_b_uuid) REFERENCES received_cards(uuid)
);

CREATE INDEX idx_cross_user_matches_card_a ON cross_user_matches(card_a_uuid);
CREATE INDEX idx_cross_user_matches_card_b ON cross_user_matches(card_b_uuid);
CREATE INDEX idx_cross_user_matches_disputed ON cross_user_matches(disputed);
CREATE INDEX idx_cross_user_matches_matched_at ON cross_user_matches(matched_at);

-- 2. 錯誤回報
CREATE TABLE error_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_uuid TEXT NOT NULL,
  update_id INTEGER NOT NULL,
  error_type TEXT NOT NULL,
  description TEXT,
  reported_at INTEGER NOT NULL,
  reported_by TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  analyzed_at INTEGER,
  resolution TEXT,
  FOREIGN KEY (card_uuid) REFERENCES received_cards(uuid),
  FOREIGN KEY (update_id) REFERENCES cross_user_matches(id)
);

CREATE INDEX idx_error_reports_card ON error_reports(card_uuid);
CREATE INDEX idx_error_reports_status ON error_reports(status);
CREATE INDEX idx_error_reports_reported_by ON error_reports(reported_by);
CREATE INDEX idx_error_reports_update_id ON error_reports(update_id);

-- 3. 匹配黑名單
CREATE TABLE matching_blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_a_uuid TEXT NOT NULL,
  card_b_uuid TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  UNIQUE(card_a_uuid, card_b_uuid)
);

CREATE INDEX idx_matching_blacklist_card_a ON matching_blacklist(card_a_uuid);
CREATE INDEX idx_matching_blacklist_card_b ON matching_blacklist(card_b_uuid);
CREATE INDEX idx_matching_blacklist_expires ON matching_blacklist(expires_at);

-- 4. 使用者信譽
CREATE TABLE user_reputation (
  user_email TEXT PRIMARY KEY,
  correct_reports INTEGER DEFAULT 0,
  incorrect_reports INTEGER DEFAULT 0,
  total_reports INTEGER DEFAULT 0,
  updates_received INTEGER DEFAULT 0,
  updates_accepted INTEGER DEFAULT 0,
  updates_rejected INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 50,
  last_updated INTEGER NOT NULL
);

CREATE INDEX idx_user_reputation_score ON user_reputation(reputation_score);

-- 5. 聯絡方式歷史
CREATE TABLE contact_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_uuid TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  valid_from INTEGER NOT NULL,
  valid_until INTEGER,
  source TEXT,
  source_user TEXT,
  FOREIGN KEY (card_uuid) REFERENCES received_cards(uuid)
);

CREATE INDEX idx_contact_history_card ON contact_history(card_uuid);
CREATE INDEX idx_contact_history_valid ON contact_history(valid_until);

-- 6. 品質指標
CREATE TABLE quality_metrics (
  date TEXT PRIMARY KEY,
  total_updates INTEGER DEFAULT 0,
  accepted_updates INTEGER DEFAULT 0,
  reported_errors INTEGER DEFAULT 0,
  error_rate REAL DEFAULT 0,
  confidence_85_90 INTEGER DEFAULT 0,
  confidence_90_95 INTEGER DEFAULT 0,
  confidence_95_100 INTEGER DEFAULT 0,
  avg_confidence REAL DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0
);

CREATE INDEX idx_quality_metrics_date ON quality_metrics(date);

-- 7. 擴充 received_cards
ALTER TABLE received_cards ADD COLUMN updated_by_community INTEGER DEFAULT 0;
ALTER TABLE received_cards ADD COLUMN last_community_update INTEGER;
ALTER TABLE received_cards ADD COLUMN community_update_count INTEGER DEFAULT 0;
ALTER TABLE received_cards ADD COLUMN job_history TEXT;

CREATE INDEX idx_received_cards_community_updated ON received_cards(updated_by_community);
CREATE INDEX idx_received_cards_last_update ON received_cards(last_community_update);
```

---

## 3. 核心流程

### 3.1 跨使用者匹配流程

#### Cron Job: crossUserSync (每日 18:00 執行)

```typescript
/**
 * 跨使用者協同同步 Cron Job
 * 每日執行，處理最近 7 天的新增/更新名片
 */
export async function crossUserSync(env: Env): Promise<{
  processed: number;
  matched: number;
  updated: number;
  errors: number;
}> {
  const stats = { processed: 0, matched: 0, updated: 0, errors: 0 };
  const LOOKBACK_DAYS = 7;
  const cutoffTime = Date.now() - (LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  
  // 1. 取得最近更新的名片
  const recentCards = await env.DB.prepare(`
    SELECT * FROM received_cards
    WHERE updated_at > ?
      AND deleted_at IS NULL
      AND merged_to IS NULL
    ORDER BY updated_at DESC
    LIMIT 1000
  `).bind(cutoffTime).all();
  
  console.log(`[CrossUserSync] Processing ${recentCards.results.length} recent cards`);
  
  // 2. 逐一處理
  for (const newCard of recentCards.results) {
    stats.processed++;
    
    try {
      // 3. 查找跨使用者匹配
      const matches = await findCrossUserMatches(env, newCard);
      
      if (matches.length === 0) continue;
      
      stats.matched += matches.length;
      
      // 4. 處理每個匹配
      for (const match of matches) {
        // 檢查黑名單
        if (await isBlacklisted(env, match.oldCard.uuid, newCard.uuid)) {
          console.log(`[CrossUserSync] Skipped blacklisted pair: ${match.oldCard.uuid} <-> ${newCard.uuid}`);
          continue;
        }
        
        // 判斷更新類型
        const updateType = determineUpdateType(match.oldCard, newCard);
        
        if (updateType === 'no_update') continue;
        
        // 執行更新
        await applyUpdate(env, match.oldCard, newCard, updateType, match.confidence);
        
        // 記錄匹配
        await recordCrossUserMatch(env, {
          cardA: match.oldCard,
          cardB: newCard,
          confidence: match.confidence,
          reason: match.reason,
          updateType
        });
        
        stats.updated++;
      }
      
    } catch (error) {
      console.error(`[CrossUserSync] Error processing card ${newCard.uuid}:`, error);
      stats.errors++;
    }
  }
  
  // 5. 記錄品質指標
  await recordQualityMetrics(env, stats);
  
  console.log(`[CrossUserSync] Complete:`, stats);
  return stats;
}
```

#### 查找跨使用者匹配

```typescript
/**
 * 查找跨使用者匹配
 */
async function findCrossUserMatches(
  env: Env,
  newCard: any
): Promise<Array<{ oldCard: any; confidence: number; reason: string }>> {
  
  const matches: Array<{ oldCard: any; confidence: number; reason: string }> = [];
  
  // 1. Email 完全匹配（最高優先級）
  if (newCard.email) {
    const emailMatches = await env.DB.prepare(`
      SELECT * FROM received_cards
      WHERE email = ?
        AND user_email != ?
        AND deleted_at IS NULL
        AND merged_to IS NULL
      LIMIT 10
    `).bind(newCard.email, newCard.user_email).all();
    
    for (const card of emailMatches.results) {
      matches.push({
        oldCard: card,
        confidence: 1.00,
        reason: 'email_exact_match'
      });
    }
  }
  
  // 2. 電話完全匹配
  if (newCard.phone && matches.length === 0) {
    const phoneNormalized = normalizePhone(newCard.phone);
    const phoneMatches = await env.DB.prepare(`
      SELECT * FROM received_cards
      WHERE replace(replace(replace(phone, '-', ''), ' ', ''), '+', '') = ?
        AND user_email != ?
        AND deleted_at IS NULL
        AND merged_to IS NULL
      LIMIT 10
    `).bind(phoneNormalized, newCard.user_email).all();
    
    for (const card of phoneMatches.results) {
      matches.push({
        oldCard: card,
        confidence: 0.95,
        reason: 'phone_exact_match'
      });
    }
  }
  
  // 3. FileSearchStore 上下文匹配（姓名 + 組織）
  if (matches.length === 0 && env.FILE_SEARCH_STORE_NAME) {
    const contextMatches = await queryFileSearchStoreForMatches(
      env,
      newCard.full_name,
      newCard.organization,
      newCard.user_email
    );
    
    matches.push(...contextMatches);
  }
  
  // 4. 過濾低信心度匹配
  return matches.filter(m => m.confidence >= 0.85);
}
```

#### 判斷更新類型

```typescript
/**
 * 判斷更新類型
 */
function determineUpdateType(
  oldCard: any,
  newCard: any
): 'job_change' | 'promotion' | 'contact_update' | 'enrichment' | 'no_update' {
  
  // 1. 組織不同 → 轉職
  if (oldCard.organization !== newCard.organization) {
    return 'job_change';
  }
  
  // 2. 同組織，職位不同 → 晉升
  if (oldCard.title !== newCard.title) {
    return 'promotion';
  }
  
  // 3. 聯絡方式不同 → 聯絡方式更新
  if (oldCard.email !== newCard.email || oldCard.phone !== newCard.phone) {
    return 'contact_update';
  }
  
  // 4. 資訊補充（舊名片缺少資訊）
  const hasNewInfo = 
    (!oldCard.company_summary && newCard.company_summary) ||
    (!oldCard.website && newCard.website) ||
    (!oldCard.address && newCard.address);
  
  if (hasNewInfo) {
    return 'enrichment';
  }
  
  return 'no_update';
}
```

**繼續閱讀**: 下一部分將詳細說明更新執行、錯誤處理、使用者體驗設計。


#### 執行更新

```typescript
/**
 * 執行協同更新
 */
async function applyUpdate(
  env: Env,
  oldCard: any,
  newCard: any,
  updateType: string,
  confidence: number
): Promise<void> {
  
  const now = Date.now();
  
  switch (updateType) {
    case 'job_change':
    case 'promotion':
      await updateJobHistory(env, oldCard, newCard, updateType, now);
      break;
      
    case 'contact_update':
      await updateContactHistory(env, oldCard, newCard, now);
      break;
      
    case 'enrichment':
      await enrichCardInfo(env, oldCard, newCard, now);
      break;
  }
  
  // 更新社群更新標記
  await env.DB.prepare(`
    UPDATE received_cards
    SET updated_by_community = 1,
        last_community_update = ?,
        community_update_count = community_update_count + 1,
        updated_at = ?
    WHERE uuid = ?
  `).bind(now, now, oldCard.uuid).run();
}

/**
 * 更新職位歷史
 */
async function updateJobHistory(
  env: Env,
  oldCard: any,
  newCard: any,
  changeType: 'job_change' | 'promotion',
  timestamp: number
): Promise<void> {
  
  // 解析現有職位歷史
  let jobHistory: Array<{
    organization: string;
    title: string;
    department?: string;
    date: number;
    type: string;
    status: 'past' | 'current';
  }> = [];
  
  try {
    if (oldCard.job_history) {
      jobHistory = JSON.parse(oldCard.job_history);
    }
  } catch (error) {
    console.error('[UpdateJobHistory] Failed to parse job_history:', error);
  }
  
  // 標記舊職位為 past
  for (const job of jobHistory) {
    if (job.status === 'current') {
      job.status = 'past';
    }
  }
  
  // 添加舊名片的職位（如果不存在）
  const oldJobExists = jobHistory.some(j => 
    j.organization === oldCard.organization &&
    j.title === oldCard.title
  );
  
  if (!oldJobExists) {
    jobHistory.push({
      organization: oldCard.organization || '',
      title: oldCard.title || '',
      department: oldCard.department || undefined,
      date: oldCard.created_at,
      type: 'original',
      status: 'past'
    });
  }
  
  // 添加新職位
  jobHistory.push({
    organization: newCard.organization || '',
    title: newCard.title || '',
    department: newCard.department || undefined,
    date: timestamp,
    type: changeType,
    status: 'current'
  });
  
  // 按時間排序（最新的在前）
  jobHistory.sort((a, b) => b.date - a.date);
  
  // 更新資料庫
  await env.DB.prepare(`
    UPDATE received_cards
    SET job_history = ?,
        organization = ?,
        title = ?,
        department = ?
    WHERE uuid = ?
  `).bind(
    JSON.stringify(jobHistory),
    newCard.organization,
    newCard.title,
    newCard.department,
    oldCard.uuid
  ).run();
}

/**
 * 更新聯絡方式歷史
 */
async function updateContactHistory(
  env: Env,
  oldCard: any,
  newCard: any,
  timestamp: number
): Promise<void> {
  
  // 1. 標記舊聯絡方式為過期
  if (oldCard.phone || oldCard.email) {
    await env.DB.prepare(`
      UPDATE contact_history
      SET valid_until = ?
      WHERE card_uuid = ? AND valid_until IS NULL
    `).bind(timestamp, oldCard.uuid).run();
    
    // 如果沒有歷史記錄，創建一筆
    const hasHistory = await env.DB.prepare(`
      SELECT 1 FROM contact_history WHERE card_uuid = ? LIMIT 1
    `).bind(oldCard.uuid).first();
    
    if (!hasHistory) {
      await env.DB.prepare(`
        INSERT INTO contact_history (
          card_uuid, phone, email, valid_from, valid_until, source
        ) VALUES (?, ?, ?, ?, ?, 'original')
      `).bind(
        oldCard.uuid,
        oldCard.phone,
        oldCard.email,
        oldCard.created_at,
        timestamp
      ).run();
    }
  }
  
  // 2. 新增新聯絡方式
  await env.DB.prepare(`
    INSERT INTO contact_history (
      card_uuid, phone, email, valid_from, valid_until, source, source_user
    ) VALUES (?, ?, ?, ?, NULL, 'community_update', ?)
  `).bind(
    oldCard.uuid,
    newCard.phone,
    newCard.email,
    timestamp,
    newCard.user_email
  ).run();
  
  // 3. 更新主表
  await env.DB.prepare(`
    UPDATE received_cards
    SET phone = ?, email = ?
    WHERE uuid = ?
  `).bind(newCard.phone, newCard.email, oldCard.uuid).run();
}

/**
 * 補充名片資訊
 */
async function enrichCardInfo(
  env: Env,
  oldCard: any,
  newCard: any,
  timestamp: number
): Promise<void> {
  
  const updates: Record<string, any> = {};
  
  // 補充缺失的欄位
  const fieldsToEnrich = [
    'company_summary',
    'personal_summary',
    'website',
    'address',
    'organization_en',
    'organization_alias'
  ];
  
  for (const field of fieldsToEnrich) {
    if (!oldCard[field] && newCard[field]) {
      updates[field] = newCard[field];
    }
  }
  
  if (Object.keys(updates).length === 0) return;
  
  // 構建 SQL
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  
  await env.DB.prepare(`
    UPDATE received_cards
    SET ${setClause}
    WHERE uuid = ?
  `).bind(...values, oldCard.uuid).run();
}
```

---

## 4. 錯誤處理

### 4.1 錯誤回報 API

```typescript
/**
 * POST /api/user/error-report
 * 使用者回報協同更新錯誤
 */
export async function handleErrorReport(
  request: Request,
  env: Env
): Promise<Response> {
  
  // 1. 驗證 OAuth
  const userResult = await verifyOAuth(request, env);
  if (userResult instanceof Response) return userResult;
  const user = userResult;
  
  // 2. 解析請求
  const body = await request.json() as {
    card_uuid: string;
    update_id: number;
    error_type: 'wrong_person' | 'wrong_info' | 'outdated' | 'other';
    description?: string;
  };
  
  // 3. 驗證
  if (!body.card_uuid || !body.update_id || !body.error_type) {
    return errorResponse('INVALID_REQUEST', 'Missing required fields', 400);
  }
  
  // 4. 檢查回報頻率限制
  const canReport = await checkReportLimit(user.email, env);
  if (!canReport) {
    return errorResponse('RATE_LIMIT', 'Too many reports. Please try again later.', 429);
  }
  
  // 5. 記錄錯誤回報
  const reportId = await env.DB.prepare(`
    INSERT INTO error_reports (
      card_uuid, update_id, error_type, description,
      reported_at, reported_by, status
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
    RETURNING id
  `).bind(
    body.card_uuid,
    body.update_id,
    body.error_type,
    body.description || null,
    Date.now(),
    user.email
  ).first();
  
  // 6. 立即回滾更新
  await rollbackUpdate(env, body.update_id);
  
  // 7. 標記為有爭議
  await env.DB.prepare(`
    UPDATE cross_user_matches
    SET disputed = 1, dispute_count = dispute_count + 1
    WHERE id = ?
  `).bind(body.update_id).run();
  
  // 8. 加入黑名單（暫時）
  const match = await env.DB.prepare(`
    SELECT card_a_uuid, card_b_uuid FROM cross_user_matches WHERE id = ?
  `).bind(body.update_id).first();
  
  if (match) {
    await env.DB.prepare(`
      INSERT OR IGNORE INTO matching_blacklist (
        card_a_uuid, card_b_uuid, reason, created_at, expires_at
      ) VALUES (?, ?, 'user_reported', ?, ?)
    `).bind(
      match.card_a_uuid,
      match.card_b_uuid,
      Date.now(),
      Date.now() + (30 * 24 * 60 * 60 * 1000)  // 30 天後過期
    ).run();
  }
  
  // 9. 背景分析（非阻塞）
  // ctx.waitUntil(analyzeErrorReport(reportId, env));
  
  return jsonResponse({
    success: true,
    message: '已回滾更新，感謝您的回報',
    report_id: reportId
  });
}

/**
 * 回滾更新
 */
async function rollbackUpdate(env: Env, updateId: number): Promise<void> {
  // 取得匹配資訊
  const match = await env.DB.prepare(`
    SELECT * FROM cross_user_matches WHERE id = ?
  `).bind(updateId).first();
  
  if (!match) return;
  
  // 根據更新類型回滾
  switch (match.update_type) {
    case 'job_change':
    case 'promotion':
      await rollbackJobHistory(env, match.card_a_uuid);
      break;
      
    case 'contact_update':
      await rollbackContactUpdate(env, match.card_a_uuid);
      break;
      
    case 'enrichment':
      await rollbackEnrichment(env, match.card_a_uuid, match.card_b_uuid);
      break;
  }
  
  // 重置社群更新標記
  await env.DB.prepare(`
    UPDATE received_cards
    SET community_update_count = GREATEST(0, community_update_count - 1)
    WHERE uuid = ?
  `).bind(match.card_a_uuid).run();
}
```

### 4.2 背景分析

```typescript
/**
 * 分析錯誤回報，優化匹配演算法
 */
async function analyzeErrorReport(
  reportId: number,
  env: Env
): Promise<void> {
  
  // 1. 取得回報資訊
  const report = await env.DB.prepare(`
    SELECT er.*, cum.*
    FROM error_reports er
    JOIN cross_user_matches cum ON er.update_id = cum.id
    WHERE er.id = ?
  `).bind(reportId).first();
  
  if (!report) return;
  
  // 2. 根據錯誤類型調整
  switch (report.error_type) {
    case 'wrong_person':
      // 最嚴重：匹配演算法誤判
      await adjustMatchingThreshold(env, 'increase', 0.02);
      await recordNegativeSample(env, report);
      break;
      
    case 'wrong_info':
      // 來源名片品質問題
      await flagSourceCard(env, report.card_b_uuid);
      break;
      
    case 'outdated':
      // 時間權重調整
      await adjustTimeWeight(env, report);
      break;
  }
  
  // 3. 更新使用者信譽
  await updateUserReputation(env, report.reported_by, 'report_submitted');
  
  // 4. 標記為已分析
  await env.DB.prepare(`
    UPDATE error_reports
    SET status = 'analyzed', analyzed_at = ?
    WHERE id = ?
  `).bind(Date.now(), reportId).run();
}
```

---

## 5. 隱私與安全

### 5.1 隱私保護原則

#### A. 匿名化協同
```typescript
// ❌ 錯誤：洩漏其他使用者身份
{
  message: "使用者 B (bob@example.com) 更新了您的名片"
}

// ✅ 正確：匿名化
{
  message: "此名片資訊已由社群協同更新"
}
```

#### B. 資料最小化
```typescript
// 只儲存必要資訊
interface CrossUserMatch {
  card_a_uuid: string;      // ✅ 必要
  card_a_user: string;       // ✅ 必要（用於通知）
  card_b_uuid: string;       // ✅ 必要
  card_b_user: string;       // ✅ 必要（審計）
  // ❌ 不儲存：card_b 的詳細內容
}
```

#### C. 使用者控制
```typescript
interface UserPreferences {
  // 允許社群更新我的名片
  allow_community_updates: boolean;
  
  // 我的上傳貢獻給社群
  contribute_to_community: boolean;
  
  // 名片更新時通知我
  notify_on_updates: boolean;
  
  // 自動接受高信心度更新 (> 0.95)
  auto_accept_high_confidence: boolean;
}
```

### 5.2 安全機制

#### A. 回報頻率限制
```typescript
const REPORT_LIMITS = {
  per_hour: 5,
  per_day: 20,
  per_week: 50
};

async function checkReportLimit(
  userEmail: string,
  env: Env
): Promise<boolean> {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  
  const count = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM error_reports
    WHERE reported_by = ? AND reported_at > ?
  `).bind(userEmail, hourAgo).first();
  
  return count.count < REPORT_LIMITS.per_hour;
}
```

#### B. 信譽系統
```typescript
async function updateUserReputation(
  env: Env,
  userEmail: string,
  action: 'report_submitted' | 'report_confirmed' | 'report_rejected'
): Promise<void> {
  
  let scoreChange = 0;
  let field = '';
  
  switch (action) {
    case 'report_confirmed':
      scoreChange = +5;
      field = 'correct_reports';
      break;
    case 'report_rejected':
      scoreChange = -10;
      field = 'incorrect_reports';
      break;
    case 'report_submitted':
      field = 'total_reports';
      break;
  }
  
  await env.DB.prepare(`
    INSERT INTO user_reputation (user_email, ${field}, reputation_score, last_updated)
    VALUES (?, 1, 50 + ?, ?)
    ON CONFLICT(user_email) DO UPDATE SET
      ${field} = ${field} + 1,
      reputation_score = CLAMP(reputation_score + ?, 0, 100),
      last_updated = ?
  `).bind(userEmail, scoreChange, Date.now(), scoreChange, Date.now()).run();
}
```

#### C. 異常偵測
```typescript
async function detectAnomalousReports(
  userEmail: string,
  env: Env
): Promise<boolean> {
  
  const stats = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'resolved' AND resolution = 'confirmed' THEN 1 ELSE 0 END) as correct,
      SUM(CASE WHEN status = 'resolved' AND resolution = 'rejected' THEN 1 ELSE 0 END) as incorrect
    FROM error_reports
    WHERE reported_by = ?
  `).bind(userEmail).first();
  
  // 1. 回報率異常高（> 50%）
  if (stats.total > 20 && stats.incorrect / stats.total > 0.5) {
    return true;
  }
  
  // 2. 短時間大量回報
  const recentCount = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM error_reports
    WHERE reported_by = ? AND reported_at > ?
  `).bind(userEmail, Date.now() - 60 * 60 * 1000).first();
  
  if (recentCount.count > 10) {
    return true;
  }
  
  return false;
}
```

---

## 6. 使用者體驗

### 6.1 更新通知 UI

```html
<!-- 名片列表頁 -->
<div class="notification-banner">
  <div class="icon">🔔</div>
  <div class="content">
    <strong>名片資訊已更新 (3)</strong>
    <p>社群協同更新了 3 張名片的資訊</p>
  </div>
  <button onclick="viewUpdates()">查看</button>
</div>

<!-- 更新詳情 Modal -->
<div class="update-modal">
  <h3>名片資訊已更新</h3>
  
  <div class="card-preview">
    <h4>張三</h4>
    <div class="update-item">
      <span class="label">曾任：</span>
      <span class="value">ABC 公司 工程師 (2026-01)</span>
    </div>
    <div class="update-item highlight">
      <span class="label">現任：</span>
      <span class="value">XYZ 公司 資深工程師 (2026-03)</span>
    </div>
  </div>
  
  <div class="update-info">
    <p>ℹ️ 此資訊由社群協同更新</p>
    <p>信心度：95%</p>
  </div>
  
  <div class="actions">
    <button class="btn-secondary" onclick="reportError()">回報錯誤</button>
    <button class="btn-primary" onclick="confirmUpdate()">確認</button>
  </div>
</div>
```

### 6.2 名片詳情頁

```html
<div class="card-detail">
  <div class="header">
    <h2>張三</h2>
    <span class="badge">社群協同維護</span>
  </div>
  
  <div class="current-info">
    <h3>目前資訊</h3>
    <p><strong>職位：</strong>資深工程師</p>
    <p><strong>公司：</strong>XYZ 公司</p>
    <p><strong>電話：</strong>0987-654-321</p>
    <p><strong>Email：</strong>zhang@xyz.com</p>
  </div>
  
  <div class="job-history">
    <h3>職位歷史</h3>
    <ul>
      <li class="current">
        <span class="date">2026-03 ~ 現在</span>
        <span class="position">XYZ 公司 - 資深工程師</span>
        <span class="badge">轉職</span>
      </li>
      <li>
        <span class="date">2026-01 ~ 2026-03</span>
        <span class="position">ABC 公司 - 工程師</span>
      </li>
    </ul>
  </div>
  
  <div class="community-info">
    <p>ℹ️ 此名片由 2 位使用者協同維護</p>
    <p>最後更新：2026-03-01</p>
  </div>
</div>
```

### 6.3 錯誤回報流程

```html
<!-- 步驟 1: 選擇錯誤類型 -->
<div class="error-report-modal">
  <h3>回報錯誤</h3>
  
  <div class="error-types">
    <label>
      <input type="radio" name="error_type" value="wrong_person">
      <span>這不是同一個人</span>
    </label>
    <label>
      <input type="radio" name="error_type" value="wrong_info">
      <span>資訊不正確</span>
    </label>
    <label>
      <input type="radio" name="error_type" value="outdated">
      <span>資訊已過時</span>
    </label>
    <label>
      <input type="radio" name="error_type" value="other">
      <span>其他</span>
    </label>
  </div>
  
  <textarea placeholder="說明（選填）" rows="3"></textarea>
  
  <div class="actions">
    <button class="btn-secondary" onclick="closeModal()">取消</button>
    <button class="btn-primary" onclick="submitReport()">送出</button>
  </div>
</div>

<!-- 步驟 2: 確認回報 -->
<div class="success-message">
  <div class="icon">✅</div>
  <h3>已回滾更新</h3>
  <p>您的名片已恢復原狀，感謝您的回報。</p>
  <p>此回報將幫助我們改進匹配演算法。</p>
  <button onclick="closeModal()">關閉</button>
</div>
```

---

## 7. 實施路徑

### 7.1 Phase 0: 前置修復（1 週）

**目標**: 修復當前去重功能，讓使用者看到去重效果

**任務**:
- [ ] 修改所有 SQL 查詢，新增 `AND merged_to IS NULL`
- [ ] 部署到 Staging 測試
- [ ] 驗證去重功能生效
- [ ] 部署到 Production

**交付物**:
- 修改 12 個文件，20 處 SQL 查詢
- BDD 測試通過
- 使用者不再看到重複名片

---

### 7.2 Phase 1: 資料庫基礎設施（2 週）

**目標**: 建立協同學習所需的資料庫結構

**任務**:
- [ ] 設計 Migration 0036
- [ ] 創建 6 個新表格
- [ ] 擴充 received_cards 欄位
- [ ] 本地測試 Migration
- [ ] 部署到 Staging
- [ ] 部署到 Production

**交付物**:
- `migrations/0036_collaborative_learning.sql`
- 資料庫 Schema 文檔
- 索引效能測試報告

---

### 7.3 Phase 2: 跨使用者匹配引擎（3 週）

**目標**: 實作跨使用者身份識別與匹配

**任務**:
- [ ] 實作 `findCrossUserMatches()`
- [ ] 實作 `calculateMatchConfidence()`
- [ ] 整合 FileSearchStore 查詢
- [ ] 實作匹配黑名單檢查
- [ ] 單元測試（覆蓋率 > 80%）
- [ ] 整合測試

**交付物**:
- `src/cron/cross-user-sync.ts`
- `src/utils/matching.ts`
- 測試報告（準確率 > 90%）

---

### 7.4 Phase 3: 資訊同步引擎（2 週）

**目標**: 實作資訊更新邏輯

**任務**:
- [ ] 實作 `determineUpdateType()`
- [ ] 實作 `updateJobHistory()`
- [ ] 實作 `updateContactHistory()`
- [ ] 實作 `enrichCardInfo()`
- [ ] 實作 `recordCrossUserMatch()`
- [ ] 單元測試

**交付物**:
- `src/utils/sync.ts`
- 更新邏輯測試報告

---

### 7.5 Phase 4: 錯誤處理系統（2 週）

**目標**: 實作錯誤回報與品質控制

**任務**:
- [ ] 實作 `handleErrorReport()` API
- [ ] 實作 `rollbackUpdate()`
- [ ] 實作 `analyzeErrorReport()`
- [ ] 實作回報頻率限制
- [ ] 實作信譽系統
- [ ] 實作異常偵測

**交付物**:
- `src/handlers/user/error-report.ts`
- `src/utils/quality-control.ts`
- 錯誤處理測試報告

---

### 7.6 Phase 5: 使用者介面（3 週）

**目標**: 實作前端 UI 與使用者體驗

**任務**:
- [ ] 更新通知 Banner
- [ ] 更新詳情 Modal
- [ ] 名片詳情頁（職位歷史）
- [ ] 錯誤回報 Modal
- [ ] 使用者偏好設定
- [ ] 響應式設計（Mobile）

**交付物**:
- 前端 UI 元件
- 使用者體驗測試報告

---

### 7.7 Phase 6: 監控與優化（1 週）

**目標**: 建立監控指標與優化機制

**任務**:
- [ ] 實作品質指標收集
- [ ] 實作 Admin Dashboard 顯示
- [ ] 實作告警機制（錯誤率 > 10%）
- [ ] 效能優化（查詢、索引）
- [ ] 負載測試

**交付物**:
- 監控 Dashboard
- 效能測試報告
- 優化建議文檔

---

### 7.8 總時程

| Phase | 時間 | 累計 |
|-------|------|------|
| Phase 0: 前置修復 | 1 週 | 1 週 |
| Phase 1: 資料庫 | 2 週 | 3 週 |
| Phase 2: 匹配引擎 | 3 週 | 6 週 |
| Phase 3: 同步引擎 | 2 週 | 8 週 |
| Phase 4: 錯誤處理 | 2 週 | 10 週 |
| Phase 5: 使用者介面 | 3 週 | 13 週 |
| Phase 6: 監控優化 | 1 週 | 14 週 |
| **總計** | **14 週** | **~3.5 個月** |

---

**繼續閱讀**: 下一部分將詳細說明風險評估、成本效益分析、監控指標。


---

## 8. 風險評估

### 8.1 技術風險

| 風險 | 機率 | 影響 | 緩解措施 | 負責人 |
|------|------|------|---------|--------|
| **匹配準確率不足** | 中 | 高 | 1. 高信心度閾值 (> 0.85)<br>2. 使用者回報機制<br>3. 持續優化演算法 | 後端團隊 |
| **FileSearchStore API 限制** | 低 | 中 | 1. 查詢頻率限制<br>2. 快取機制<br>3. 降級方案（純 D1 查詢） | 後端團隊 |
| **資料庫效能瓶頸** | 中 | 中 | 1. 索引優化<br>2. 批次處理<br>3. 查詢優化 | DBA |
| **Cron Job 執行超時** | 低 | 低 | 1. 分批處理<br>2. 斷點續傳<br>3. 監控告警 | DevOps |

### 8.2 產品風險

| 風險 | 機率 | 影響 | 緩解措施 | 負責人 |
|------|------|------|---------|--------|
| **使用者不信任協同更新** | 中 | 高 | 1. 透明化機制<br>2. 使用者控制權<br>3. 錯誤回報機制 | 產品經理 |
| **隱私疑慮** | 中 | 高 | 1. 匿名化設計<br>2. 使用者同意流程<br>3. 隱私政策更新 | 法務 + PM |
| **惡意回報攻擊** | 低 | 中 | 1. 頻率限制<br>2. 信譽系統<br>3. 異常偵測 | 安全團隊 |
| **使用者採用率低** | 中 | 中 | 1. 預設開啟（可關閉）<br>2. 使用者教育<br>3. 價值展示 | 產品經理 |

### 8.3 業務風險

| 風險 | 機率 | 影響 | 緩解措施 | 負責人 |
|------|------|------|---------|--------|
| **開發時程延誤** | 中 | 中 | 1. 分階段交付<br>2. MVP 優先<br>3. 敏捷開發 | 專案經理 |
| **成本超支** | 低 | 低 | 1. 成本監控<br>2. 預算控制<br>3. 雲端成本優化 | 財務 |
| **法規合規問題** | 低 | 高 | 1. GDPR 合規審查<br>2. 隱私影響評估<br>3. 法律諮詢 | 法務 |

### 8.4 風險矩陣

```
影響
 ↑
高│  匹配準確率不足    使用者不信任    隱私疑慮
 │                                    法規合規
 │
中│  FileSearchStore   資料庫效能     惡意回報
 │  API 限制          使用者採用率    開發延誤
 │
低│  Cron 超時        成本超支
 │
 └────────────────────────────────→ 機率
   低              中              高
```

---

## 9. 成本效益分析

### 9.1 開發成本

| 項目 | 人力 | 時間 | 成本 (USD) |
|------|------|------|-----------|
| Phase 0: 前置修復 | 1 人 | 1 週 | $2,000 |
| Phase 1: 資料庫 | 1 人 | 2 週 | $4,000 |
| Phase 2: 匹配引擎 | 2 人 | 3 週 | $12,000 |
| Phase 3: 同步引擎 | 1 人 | 2 週 | $4,000 |
| Phase 4: 錯誤處理 | 1 人 | 2 週 | $4,000 |
| Phase 5: 使用者介面 | 2 人 | 3 週 | $12,000 |
| Phase 6: 監控優化 | 1 人 | 1 週 | $2,000 |
| **總計** | **平均 1.5 人** | **14 週** | **$40,000** |

### 9.2 運營成本（年度）

| 項目 | 用量 | 單價 | 年度成本 (USD) |
|------|------|------|---------------|
| **Cloudflare Workers** | 1M requests/月 | $0.50/M | $6 |
| **D1 Database** | 10GB storage | $0.75/GB | $90 |
| **FileSearchStore** | 1000 queries/月 | $0.01/query | $120 |
| **Gemini API** | 500 calls/月 | $0.001/call | $6 |
| **Vectorize** | 100K vectors | $0.04/K | $48 |
| **R2 Storage** | 50GB | $0.015/GB | $9 |
| **總計** | | | **$279/年** |

### 9.3 效益評估

#### A. 使用者價值（定性）

| 效益 | 說明 | 價值等級 |
|------|------|---------|
| **資訊常新** | 名片資訊自動更新，無需手動維護 | ⭐⭐⭐⭐⭐ |
| **網絡效應** | 使用者越多，資訊品質越高 | ⭐⭐⭐⭐⭐ |
| **時間節省** | 減少手動更新名片的時間 | ⭐⭐⭐⭐ |
| **資訊完整性** | 自動補充缺失資訊 | ⭐⭐⭐⭐ |
| **職位追蹤** | 自動記錄職位變動歷史 | ⭐⭐⭐ |

#### B. 系統價值（定量）

**假設**:
- 100 個使用者，每人 50 張名片 = 5,000 張
- 去重率 15% = 750 張合併
- 協同更新率 10% = 500 張/年

**時間節省**:
```
手動更新時間: 5 分鐘/張
協同更新節省: 500 張 × 5 分鐘 = 2,500 分鐘 = 41.7 小時/年
人力成本: 41.7 小時 × $50/小時 = $2,085/年
```

**資訊品質提升**:
```
資訊過時率: 30% → 10% (降低 20%)
決策錯誤減少: 20% × 100 次/年 = 20 次
每次錯誤成本: $100
年度節省: 20 × $100 = $2,000/年
```

**總效益**: $2,085 + $2,000 = **$4,085/年**

### 9.4 ROI 計算

```
投資回報率 (ROI) = (效益 - 成本) / 成本 × 100%

第一年:
ROI = ($4,085 - $40,000 - $279) / ($40,000 + $279) × 100%
    = -90.1%  (負投資回報)

第二年起:
ROI = ($4,085 - $279) / $279 × 100%
    = 1,364%  (正投資回報)

回本期: 40,279 / 4,085 = 9.9 年
```

### 9.5 價值主張

雖然 ROI 計算顯示回本期較長，但考慮以下因素：

1. **網絡效應**: 使用者數量增長，價值呈指數增長
2. **競爭優勢**: 獨特功能，提升產品差異化
3. **使用者黏性**: 協同價值提升留存率
4. **品牌價值**: 創新功能提升品牌形象
5. **長期價值**: 知識庫累積，長期受益

**建議**: 
- 短期：作為差異化功能，提升產品競爭力
- 長期：隨使用者增長，價值持續提升

---

## 10. 監控指標

### 10.1 功能指標

#### A. 匹配效能

| 指標 | 目標值 | 監控頻率 | 告警閾值 |
|------|--------|---------|---------|
| 匹配準確率 | > 90% | 每日 | < 85% |
| 平均信心度 | > 0.92 | 每日 | < 0.88 |
| 匹配延遲 | < 24 小時 | 每日 | > 48 小時 |
| 黑名單命中率 | < 5% | 每週 | > 10% |

#### B. 更新效能

| 指標 | 目標值 | 監控頻率 | 告警閾值 |
|------|--------|---------|---------|
| 更新接受率 | > 70% | 每日 | < 60% |
| 錯誤回報率 | < 10% | 每日 | > 15% |
| 回滾成功率 | 100% | 即時 | < 100% |
| 平均回應時間 | < 1 秒 | 每小時 | > 3 秒 |

#### C. 品質指標

| 指標 | 目標值 | 監控頻率 | 告警閾值 |
|------|--------|---------|---------|
| 誤判率 (wrong_person) | < 5% | 每日 | > 8% |
| 資訊錯誤率 (wrong_info) | < 3% | 每日 | > 5% |
| 過時資訊率 (outdated) | < 2% | 每週 | > 5% |
| 使用者信譽平均分 | > 60 | 每週 | < 50 |

### 10.2 系統指標

#### A. 效能指標

| 指標 | 目標值 | 監控頻率 | 告警閾值 |
|------|--------|---------|---------|
| API 回應時間 (P95) | < 200ms | 即時 | > 500ms |
| Cron Job 執行時間 | < 5 分鐘 | 每日 | > 10 分鐘 |
| 資料庫查詢時間 | < 50ms | 即時 | > 100ms |
| FileSearchStore 延遲 | < 2 秒 | 即時 | > 5 秒 |

#### B. 可用性指標

| 指標 | 目標值 | 監控頻率 | 告警閾值 |
|------|--------|---------|---------|
| 系統可用性 | > 99.9% | 即時 | < 99.5% |
| 錯誤率 | < 0.1% | 即時 | > 1% |
| Cron Job 成功率 | > 99% | 每日 | < 95% |

#### C. 成本指標

| 指標 | 目標值 | 監控頻率 | 告警閾值 |
|------|--------|---------|---------|
| 月度 API 費用 | < $50 | 每日 | > $100 |
| FileSearchStore 用量 | < 1000 queries/月 | 每日 | > 2000 |
| Gemini API 用量 | < 500 calls/月 | 每日 | > 1000 |
| D1 儲存空間 | < 10GB | 每週 | > 15GB |

### 10.3 業務指標

#### A. 使用者參與

| 指標 | 目標值 | 監控頻率 | 告警閾值 |
|------|--------|---------|---------|
| 協同更新接受率 | > 70% | 每週 | < 60% |
| 錯誤回報參與率 | 5-10% | 每週 | > 20% |
| 功能啟用率 | > 80% | 每月 | < 60% |
| 使用者滿意度 | > 4.0/5.0 | 每月 | < 3.5 |

#### B. 資料品質

| 指標 | 目標值 | 監控頻率 | 告警閾值 |
|------|--------|---------|---------|
| 名片資訊完整度 | > 80% | 每週 | < 70% |
| 資訊新鮮度 | < 30 天 | 每週 | > 90 天 |
| 重複名片率 | < 5% | 每週 | > 10% |
| 職位歷史覆蓋率 | > 30% | 每月 | < 20% |

### 10.4 監控 Dashboard

#### A. 即時監控面板

```
┌─────────────────────────────────────────────────────────┐
│ 協同學習系統 - 即時監控                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📊 今日統計 (2026-03-04)                                │
│ ├─ 處理名片: 127 張                                     │
│ ├─ 匹配成功: 23 對 (18.1%)                              │
│ ├─ 更新執行: 19 張 (82.6% 接受率)                       │
│ └─ 錯誤回報: 2 筆 (10.5% 回報率)                        │
│                                                          │
│ ⚡ 效能指標                                              │
│ ├─ API 回應時間: 156ms (P95)          ✅               │
│ ├─ Cron Job 執行: 3m 42s              ✅               │
│ ├─ 資料庫查詢: 38ms (平均)            ✅               │
│ └─ FileSearchStore: 1.8s (平均)       ✅               │
│                                                          │
│ 🎯 品質指標                                              │
│ ├─ 匹配準確率: 91.3%                  ✅               │
│ ├─ 平均信心度: 0.93                   ✅               │
│ ├─ 誤判率: 4.2%                       ✅               │
│ └─ 使用者信譽: 62.5 (平均)            ✅               │
│                                                          │
│ ⚠️ 告警 (0)                                             │
│ └─ 無告警                                               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### B. 趨勢分析面板

```
┌─────────────────────────────────────────────────────────┐
│ 協同學習系統 - 7 天趨勢                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📈 匹配準確率趨勢                                        │
│ 100% ┤                                                  │
│  95% ┤     ●─────●─────●                                │
│  90% ┤   ●               ●─────●                        │
│  85% ┤ ●                         ●                      │
│  80% ┤                                                  │
│      └─────────────────────────────────────────────     │
│       2/26  2/27  2/28  3/1   3/2   3/3   3/4          │
│                                                          │
│ 📉 錯誤回報率趨勢                                        │
│  20% ┤                                                  │
│  15% ┤                                                  │
│  10% ┤ ●─────●─────●─────●─────●─────●─────●          │
│   5% ┤                                                  │
│   0% ┤                                                  │
│      └─────────────────────────────────────────────     │
│       2/26  2/27  2/28  3/1   3/2   3/3   3/4          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 11. 結論與建議

### 11.1 核心價值總結

**協同學習系統**是一個創新的功能，透過使用者之間的行為，自動維持名片資訊的常新狀態。

**關鍵優勢**:
1. ✅ **網絡效應** - 使用者越多，價值越大
2. ✅ **零維護成本** - 使用者行為自動更新
3. ✅ **資訊常新** - 自動同步最新狀態
4. ✅ **差異化競爭** - 市場上獨特功能

### 11.2 實施建議

#### 立即執行 (Phase 0)
**修復當前去重功能** - 1 週內完成
- 讓使用者看到去重效果
- 驗證 FileSearchStore 價值
- 為協同學習打基礎

#### 短期規劃 (3 個月)
**實施 Phase 1-4** - 核心功能
- 資料庫基礎設施
- 跨使用者匹配引擎
- 資訊同步引擎
- 錯誤處理系統

#### 中期規劃 (6 個月)
**實施 Phase 5-6** - 使用者體驗
- 前端 UI 完善
- 監控與優化
- 使用者教育

### 11.3 成功關鍵因素

1. **使用者信任** - 透明化、可控制、可回報
2. **匹配準確率** - > 90% 準確率是底線
3. **隱私保護** - 匿名化、資料最小化
4. **持續優化** - 從錯誤中學習，不斷改進
5. **使用者教育** - 清楚傳達價值與機制

### 11.4 風險控制

1. **分階段交付** - 降低開發風險
2. **MVP 優先** - 先驗證核心價值
3. **使用者回饋** - 持續收集改進
4. **監控告警** - 及時發現問題
5. **回滾機制** - 確保可恢復

### 11.5 最終建議

**建議立即開始 Phase 0**，修復當前去重功能，讓使用者看到效果。

**在 Phase 0 驗證成功後**，再決定是否投入資源開發完整的協同學習系統。

**關鍵決策點**:
- Phase 0 完成後，評估使用者反饋
- 若使用者對去重功能滿意，繼續 Phase 1-2
- 若使用者數量達到 50+，加速 Phase 3-6

---

## 附錄

### A. 參考文獻

1. **Collaborative Filtering**: Netflix Recommendation System
2. **Network Effects**: Metcalfe's Law
3. **Quality Control**: Wikipedia's Peer Review System
4. **Privacy by Design**: GDPR Article 25

### B. 相關文檔

- [BDD 規格: Merged Cards Filtering](./merged_cards_filtering.md)
- [技術分析: Merged Cards Filtering](./merged_cards_filtering_technical_analysis.md)
- [ADR-005: Dual Tagging System](../adr/005-dual-tagging-system.md)

### C. 變更歷史

| 版本 | 日期 | 作者 | 變更說明 |
|------|------|------|---------|
| v1.0.0 | 2026-03-04 | Kiro | 初版完成 |

---

**文檔結束**

**下一步**: 開始 Phase 0 實施，修復當前去重功能。
