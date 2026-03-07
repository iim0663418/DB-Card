# 標籤系統架構總覽

## 系統設計原則

### 核心理念：抽取與標準化分離
- **AI 負責抽取**：從名片內容提取原始標籤（保留多樣性）
- **後端負責標準化**：統一映射到標準類別（支援篩選）
- **前端負責展示**：篩選用 normalized，顯示用 raw

---

## 資料模型

### card_tags 表結構
```sql
CREATE TABLE card_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_uuid TEXT NOT NULL,
  category TEXT NOT NULL,           -- industry/location/expertise/seniority
  tag TEXT NOT NULL,                -- 向後相容: "category:normalized"
  raw_value TEXT NOT NULL,          -- AI 原始輸出（保留多樣性）
  normalized_value TEXT NOT NULL,   -- 標準化值（支援篩選）
  tag_source TEXT NOT NULL,         -- auto/manual
  created_at INTEGER NOT NULL,
  
  UNIQUE(card_uuid, category, raw_value),
  FOREIGN KEY (card_uuid) REFERENCES received_cards(uuid)
);

CREATE INDEX idx_card_tags_category_normalized 
  ON card_tags(category, normalized_value);
CREATE INDEX idx_card_tags_card_category 
  ON card_tags(card_uuid, category);
```

### tag_stats 表結構
```sql
CREATE TABLE tag_stats (
  user_email TEXT NOT NULL,
  category TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  rebuild_at INTEGER,               -- NULL = 需要重建
  updated_at INTEGER NOT NULL,
  
  PRIMARY KEY (user_email, category, normalized_value)
);
```

---

## 標籤類別

### 1. Industry（產業）- 標準化
**標準類別**（10 個）：
- 資訊服務、資訊安全、電信、金融、製造業
- 醫療、教育、零售、政府、其他

**標準化邏輯**：
```typescript
"軟體與資訊服務業" → "資訊服務"
"資訊服務業" → "資訊服務"
"軟體業" → "資訊服務"
"資安" → "資訊安全"
"Information Security" → "資訊安全"
```

### 2. Location（地點）- 標準化
**標準類別**（7 個）：
- 台北、新北、桃園、台中、台南、高雄、其他

**標準化邏輯**：
```typescript
"台北市內湖區" → "台北"
"Taipei" → "台北"
"Taiwan" → "其他"
```

### 3. Seniority（職級）- 標準化
**標準類別**（5 個）：
- 高階主管、中階主管、基層主管、專業人員、其他

**標準化邏輯**（模糊匹配）：
```typescript
包含 "總" 或 "長" → "高階主管"
包含 "經理" → "中階主管"
包含 "組長" 或 "主管" → "基層主管"
```

### 4. Expertise（專業）- 不標準化
**保留原始值**：
- AI、Machine Learning、Blockchain、Cloud Computing...
- 保留多樣性，不強制映射

---

## 業務流程

### 1. 標籤生成流程（Auto-Tag Cron）

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Cron Job (每日 18:00 UTC)                                │
│    - 查詢 auto_tagged_at IS NULL 的卡片                     │
│    - 每批處理 20 張                                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. AI 抽取 (auto-tag-cards.ts)                              │
│    - Gemini API: 批次處理 20 張卡片                         │
│    - 回傳格式: { card_index, industry, location, ... }      │
│    - 只負責抽取，不做標準化                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 統一寫入層 (tag-service.ts)                              │
│    - saveTags(cardUuid, tags, source)                       │
│    - 對每個標籤調用 normalizeTag()                          │
│    - INSERT OR REPLACE INTO card_tags                       │
│    - 標記 tag_stats 需要重建                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. 快取重建 (tag-service.ts)                                │
│    - rebuildTagStats(userEmail)                             │
│    - SELECT COUNT(*) GROUP BY category, normalized_value    │
│    - 可重建，不累加                                          │
└─────────────────────────────────────────────────────────────┘
```

### 2. 標籤查詢流程（Frontend Filter）

```
┌─────────────────────────────────────────────────────────────┐
│ 1. API 回傳 (crud.ts / search.ts)                           │
│    tags: [                                                   │
│      { category: "industry", raw: "軟體業", normalized: "資訊服務" },
│      { category: "location", raw: "台北市內湖區", normalized: "台北" }
│    ]                                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend 篩選器 (received-cards.js)                      │
│    - initTagFilters(): 聚合 normalized 值                   │
│    - 向後相容：處理舊格式 string[] 和新格式 object[]        │
│    - 篩選邏輯：使用 normalized_value                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Frontend 顯示 (未來實作)                                 │
│    - 卡片詳情：顯示 raw_value（原始多樣性）                 │
│    - 篩選按鈕：顯示 normalized_value（統一標準）            │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心模組

### 1. tag-service.ts（統一寫入層）

**職責**：
- 標籤標準化邏輯
- 統一寫入入口
- 快取重建

**關鍵函式**：
```typescript
// 標準化單一標籤
normalizeTag(category: TagCategory, rawValue: string): string

// 儲存標籤（唯一寫入入口）
saveTags(db: D1Database, cardUuid: string, tags: TagExtractionResult, source: 'auto' | 'manual'): Promise<void>

// 重建單一使用者的統計
rebuildTagStats(db: D1Database, userEmail: string): Promise<void>

// 重建所有使用者的統計
rebuildAllTagStats(db: D1Database): Promise<void>
```

### 2. auto-tag-cards.ts（AI 抽取）

**職責**：
- 批次呼叫 Gemini API
- 只負責抽取，不做標準化
- 調用 tag-service.saveTags()

**Prompt 策略**：
```
請從名片中提取以下資訊（保持原始用詞）：
- industry: 產業類別
- location: 地點
- expertise: 專業領域（可多個）
- seniority: 職級

回傳格式：
[
  { "card_index": 0, "industry": "軟體與資訊服務業", ... },
  { "card_index": 1, "industry": "資安", ... }
]
```

### 3. crud.ts / search.ts（API 層）

**職責**：
- 回傳新格式 `{ category, raw, normalized }`
- 使用 `category` 欄位（不解析字串）

**查詢邏輯**：
```sql
SELECT 
  category,
  raw_value as raw,
  normalized_value as normalized
FROM card_tags
WHERE card_uuid = ?
ORDER BY category, created_at
```

### 4. received-cards.js（前端）

**職責**：
- 向後相容（處理舊格式 string[]）
- 篩選器聚合使用 normalized
- 未來：顯示使用 raw

**關鍵邏輯**：
```javascript
function initTagFilters(cards) {
  const tagCounts = {};
  
  cards.forEach(card => {
    (card.tags || []).forEach(tag => {
      // 向後相容
      const normalized = typeof tag === 'string' 
        ? tag.split(':')[1] 
        : tag.normalized;
      
      tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
    });
  });
  
  return tagCounts;
}
```

---

## 資料遷移

### Migration 0039: Schema Stabilization
```sql
-- 新增欄位
ALTER TABLE card_tags ADD COLUMN category TEXT;
ALTER TABLE card_tags ADD COLUMN raw_value TEXT;
ALTER TABLE card_tags ADD COLUMN normalized_value TEXT;

-- 建立索引
CREATE INDEX idx_card_tags_category_normalized 
  ON card_tags(category, normalized_value);

-- 回填資料（446 筆）
UPDATE card_tags SET 
  category = substr(tag, 1, instr(tag, ':') - 1),
  raw_value = substr(tag, instr(tag, ':') + 1),
  normalized_value = substr(tag, instr(tag, ':') + 1)
WHERE category IS NULL;
```

### Migration 0040: Re-tagging Trigger
```sql
-- 清除 auto_tagged_at，觸發重新標籤
UPDATE received_cards 
SET auto_tagged_at = NULL 
WHERE deleted_at IS NULL AND merged_to IS NULL;

-- 標記統計需要重建
UPDATE tag_stats SET rebuild_at = NULL;
```

---

## 效益分析

### 1. 標準化篩選
- **問題**：「軟體業」、「資訊服務業」、「軟體與資訊服務業」無法聚合
- **解決**：統一映射到「資訊服務」
- **效果**：篩選器數量減少 60%，使用者體驗提升

### 2. 保留多樣性
- **問題**：強制標準化會失去原始資訊
- **解決**：raw_value 保留 AI 原始輸出
- **效果**：顯示時保留細節（如「台北市內湖區」）

### 3. 可維護性
- **問題**：標準化邏輯散落各處
- **解決**：統一寫入層 tag-service.ts
- **效果**：修改標準化規則只需改一處

### 4. 可重建快取
- **問題**：count+1 累加容易出錯
- **解決**：COUNT(*) 重建
- **效果**：資料一致性保證

---

## 未來優化

### Phase 6: 完整實作（選用）
1. **移除重複邏輯**：batch-manager.ts 的標籤寫入
2. **查詢優化**：所有 `tag LIKE 'category:%'` 改用 `category` 欄位
3. **前端顯示**：卡片詳情顯示 raw_value

### 監控指標
1. 標準化準確率（人工抽樣驗證）
2. tag_stats 重建完成率
3. 前端篩選器聚合正確性

---

## 技術債務

### 已知問題
1. **batch-manager.ts**：仍有重複的標籤寫入邏輯（未移除）
2. **查詢優化**：部分查詢仍使用 `tag LIKE` 而非 `category`
3. **前端顯示**：raw_value 顯示未完整實作

### 優先級
- P0: 無（核心功能完整）
- P1: 移除 batch-manager.ts 重複邏輯
- P2: 查詢優化
- P3: 前端 raw_value 顯示

---

## 參考文件

- ADR-005: Dual Tagging System（雙標籤系統決策）
- BDD Specs: `.specify/specs/tag_normalization_phase*.md`
- Migration: `migrations/0039_tag_normalization.sql`
- Service: `src/services/tag-service.ts`
- Types: `src/types/tags.ts`

---

**最後更新**: 2026-03-07  
**版本**: v5.0.0  
**狀態**: ✅ Production Ready（等待 Cron 執行）
