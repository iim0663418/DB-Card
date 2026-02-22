# BDD Spec: Tags System Schema (Migration 0027)

## Feature: 標籤系統 - 讓使用者能分類與篩選名片

### Background
當前問題：
- 名片數量多時難以管理
- 缺少分類機制
- 無法快速篩選特定類型的名片

目標：
- 支援多標籤（一張名片可有多個標籤）
- 標籤來源追蹤（手動、自動關鍵字、AI）
- 標籤統計（快取）

---

## Scenario 1: 資料庫 Schema 設計

### Given: 需要標籤系統
### When: 設計資料庫 Schema
### Then: 應包含以下表格

**card_tags 表**（標籤關聯）：
```sql
CREATE TABLE card_tags (
  card_uuid TEXT NOT NULL,
  tag TEXT NOT NULL,
  tag_source TEXT NOT NULL DEFAULT 'manual',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (card_uuid, tag),
  FOREIGN KEY (card_uuid) REFERENCES received_cards(uuid) ON DELETE CASCADE
);
```

**tag_stats 表**（標籤統計快取）：
```sql
CREATE TABLE tag_stats (
  user_email TEXT NOT NULL,
  tag TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_updated INTEGER NOT NULL,
  PRIMARY KEY (user_email, tag)
);
```

**索引**：
- `idx_card_tags_tag` - 按標籤查詢
- `idx_card_tags_card` - 按名片查詢
- `idx_card_tags_source` - 按來源查詢
- `idx_tag_stats_user` - 按使用者查詢
- `idx_tag_stats_count` - 按數量排序

---

## Scenario 2: 標籤來源類型

### Given: 標籤可來自不同來源
### When: 定義 tag_source 欄位
### Then: 應支援以下類型

**tag_source 可能的值**：
- `manual`: 使用者手動新增
- `auto_keyword`: 關鍵字自動提取（基於 organization）
- `auto_ai`: AI 自動提取（基於 company_summary，Phase 2）

---

## Scenario 3: Migration 檔案內容

### Given: 需要創建 Migration 檔案
### When: 創建 `workers/migrations/0027_tags_system.sql`
### Then: 檔案內容應包含：

```sql
-- Migration 0027: Tags System
-- 標籤系統 - 分類與篩選名片

-- 1. 標籤關聯表
CREATE TABLE card_tags (
  card_uuid TEXT NOT NULL,
  tag TEXT NOT NULL,
  tag_source TEXT NOT NULL DEFAULT 'manual',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (card_uuid, tag),
  FOREIGN KEY (card_uuid) REFERENCES received_cards(uuid) ON DELETE CASCADE
);

CREATE INDEX idx_card_tags_tag ON card_tags(tag);
CREATE INDEX idx_card_tags_card ON card_tags(card_uuid);
CREATE INDEX idx_card_tags_source ON card_tags(tag_source);

-- 2. 標籤統計表（快取）
CREATE TABLE tag_stats (
  user_email TEXT NOT NULL,
  tag TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_updated INTEGER NOT NULL,
  PRIMARY KEY (user_email, tag)
);

CREATE INDEX idx_tag_stats_user ON tag_stats(user_email);
CREATE INDEX idx_tag_stats_count ON tag_stats(user_email, count DESC);

-- 回滾方案（註解）
-- DROP TABLE IF EXISTS card_tags;
-- DROP TABLE IF EXISTS tag_stats;
```

---

## Scenario 4: 標籤關聯查詢

### Given: 名片已有標籤
### When: 查詢名片的所有標籤
### Then: 應回傳標籤列表

**查詢**：
```sql
SELECT tag, tag_source, created_at
FROM card_tags
WHERE card_uuid = ?
ORDER BY created_at DESC;
```

**預期結果**：
```json
[
  { "tag": "AI", "tag_source": "auto_keyword", "created_at": 1234567890 },
  { "tag": "政府", "tag_source": "manual", "created_at": 1234567891 }
]
```

---

## Scenario 5: 標籤統計查詢

### Given: 使用者有多張名片
### When: 查詢標籤統計
### Then: 應回傳標籤與數量

**查詢**：
```sql
SELECT tag, count, last_updated
FROM tag_stats
WHERE user_email = ?
ORDER BY count DESC;
```

**預期結果**：
```json
[
  { "tag": "AI", "count": 15, "last_updated": 1234567890 },
  { "tag": "政府", "count": 8, "last_updated": 1234567891 }
]
```

---

## Scenario 6: 級聯刪除驗證

### Given: 名片有標籤
### When: 刪除名片
### Then: 相關標籤應自動刪除

**驗證**：
```sql
-- 刪除名片
DELETE FROM received_cards WHERE uuid = ?;

-- 驗證標籤已刪除
SELECT COUNT(*) FROM card_tags WHERE card_uuid = ?;
-- 預期：0
```

---

## Scenario 7: 租戶隔離驗證

### Given: 多個使用者有相同標籤名稱
### When: 查詢標籤統計
### Then: 只回傳該使用者的統計

**驗證**：
```sql
-- 使用者 A 的標籤統計
SELECT * FROM tag_stats WHERE user_email = 'user_a@example.com';

-- 使用者 B 的標籤統計
SELECT * FROM tag_stats WHERE user_email = 'user_b@example.com';

-- 兩者應完全獨立
```

---

## Acceptance Criteria

### Migration
- [ ] Migration 檔案已創建：`workers/migrations/0027_tags_system.sql`
- [ ] Migration 可在 Staging 執行
- [ ] `card_tags` 表已創建
- [ ] `tag_stats` 表已創建
- [ ] 所有索引已創建

### Schema 驗證
- [ ] `card_tags` 表有 4 個欄位
- [ ] `tag_stats` 表有 4 個欄位
- [ ] 主鍵正確設定
- [ ] 外鍵約束正確
- [ ] 級聯刪除正常運作

### 查詢驗證
- [ ] 標籤關聯查詢正常
- [ ] 標籤統計查詢正常
- [ ] 租戶隔離正常

---

## Non-Goals (本階段不做)

- ❌ 標籤提取邏輯（Week 1 Day 6）
- ❌ 標籤 API（Week 2）
- ❌ 前端 UI（Week 2）

---

## Technical Notes

1. **複合主鍵**：
   - `card_tags`: (card_uuid, tag) - 防止重複標籤
   - `tag_stats`: (user_email, tag) - 租戶隔離

2. **級聯刪除**：
   - 刪除名片時自動刪除標籤
   - 使用 `ON DELETE CASCADE`

3. **索引策略**：
   - `tag` 欄位需要索引（篩選查詢）
   - `count DESC` 索引（排序優化）

4. **統計快取**：
   - `tag_stats` 表避免重複計算
   - 新增/刪除標籤時更新

5. **標籤命名規則**：
   - 小寫英文或中文
   - 最長 50 字元
   - 不允許特殊字元（前端驗證）

---

## Estimated Time: 2 hours

- Migration 檔案撰寫：30 分鐘
- 本地測試：30 分鐘
- Staging 部署：30 分鐘
- 驗證與文檔：30 分鐘
