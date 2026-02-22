# BDD Spec: Tag Extraction Logic

## Feature: 標籤提取邏輯 - 自動從名片資料提取標籤

### Background
當前問題：
- 使用者需要手動新增標籤
- 缺少自動分類機制

目標：
- 基於 organization 欄位自動提取關鍵字標籤
- 儲存名片時自動執行
- 更新標籤統計

---

## Scenario 1: 關鍵字匹配規則

### Given: 定義關鍵字匹配規則
### When: 設計標籤提取邏輯
### Then: 應包含以下類型

**COMPANY_TYPE_KEYWORDS**：
```typescript
{
  government: ['政府', '部會', '機關', '局', '署', '處'],
  listed: ['股份有限公司', '有限公司', 'Co., Ltd.', 'Inc.'],
  startup: ['新創', '創業', 'Startup'],
  ngo: ['基金會', '協會', '學會', '公會']
}
```

---

## Scenario 2: 標籤提取函式

### Given: 名片的 organization 欄位
### When: 呼叫 `extractTagsFromOrganization(organization)`
### Then: 回傳匹配的標籤陣列

**函式簽名**：
```typescript
function extractTagsFromOrganization(organization: string): string[]
```

**邏輯**：
1. 檢查 organization 是否為空
2. 轉換為小寫（不區分大小寫）
3. 遍歷關鍵字規則
4. 每個類型只匹配一次
5. 回傳標籤陣列

---

## Scenario 3: 政府機關標籤

### Given: organization = "數位發展部"
### When: 提取標籤
### Then: 應回傳 ["government"]

**驗證**：
```typescript
const tags = extractTagsFromOrganization("數位發展部");
expect(tags).toEqual(["government"]);
```

---

## Scenario 4: 上市公司標籤

### Given: organization = "台積電股份有限公司"
### When: 提取標籤
### Then: 應回傳 ["listed"]

**驗證**：
```typescript
const tags = extractTagsFromOrganization("台積電股份有限公司");
expect(tags).toEqual(["listed"]);
```

---

## Scenario 5: 新創公司標籤

### Given: organization = "AI 新創科技"
### When: 提取標籤
### Then: 應回傳 ["startup"]

**驗證**：
```typescript
const tags = extractTagsFromOrganization("AI 新創科技");
expect(tags).toEqual(["startup"]);
```

---

## Scenario 6: 非營利組織標籤

### Given: organization = "台灣人工智慧協會"
### When: 提取標籤
### Then: 應回傳 ["ngo"]

**驗證**：
```typescript
const tags = extractTagsFromOrganization("台灣人工智慧協會");
expect(tags).toEqual(["ngo"]);
```

---

## Scenario 7: 空值處理

### Given: organization = null 或 undefined 或 ""
### When: 提取標籤
### Then: 應回傳空陣列 []

**驗證**：
```typescript
expect(extractTagsFromOrganization(null)).toEqual([]);
expect(extractTagsFromOrganization(undefined)).toEqual([]);
expect(extractTagsFromOrganization("")).toEqual([]);
```

---

## Scenario 8: 無匹配關鍵字

### Given: organization = "一般公司"
### When: 提取標籤
### Then: 應回傳空陣列 []

**驗證**：
```typescript
const tags = extractTagsFromOrganization("一般公司");
expect(tags).toEqual([]);
```

---

## Scenario 9: 儲存名片時自動提取

### Given: 使用者儲存名片
### When: 呼叫 `handleSaveCard()`
### Then: 應自動提取並儲存標籤

**流程**：
1. 儲存名片到 received_cards
2. 若有 organization，提取標籤
3. 批次插入 card_tags（tag_source='auto_keyword'）
4. 更新 tag_stats 統計

**實作位置**：`workers/src/handlers/user/received-cards/crud.ts`

---

## Scenario 10: 標籤統計更新

### Given: 新增標籤到名片
### When: 更新 tag_stats
### Then: 應使用 UPSERT 邏輯

**SQL**：
```sql
INSERT INTO tag_stats (user_email, tag, count, last_updated)
VALUES (?, ?, 1, ?)
ON CONFLICT(user_email, tag) DO UPDATE SET
  count = (
    SELECT COUNT(*) 
    FROM card_tags ct
    JOIN received_cards rc ON ct.card_uuid = rc.uuid
    WHERE ct.tag = excluded.tag 
      AND rc.user_email = excluded.user_email 
      AND rc.deleted_at IS NULL
  ),
  last_updated = excluded.last_updated
```

**說明**：
- 使用 COUNT 重算（確保準確性）
- 租戶隔離（user_email）
- 排除已刪除的名片（deleted_at IS NULL）

---

## Acceptance Criteria

### 函式實作
- [ ] `extractTagsFromOrganization()` 函式已實作
- [ ] 關鍵字規則已定義
- [ ] 所有測試案例通過

### 整合實作
- [ ] `handleSaveCard()` 已整合標籤提取
- [ ] 批次插入 card_tags
- [ ] 更新 tag_stats 統計
- [ ] 租戶隔離正確

### 測試
- [ ] TypeScript 編譯通過
- [ ] 單元測試通過（8 個 Scenario）
- [ ] 整合測試通過

---

## Implementation Details

### 檔案位置
- **修改**：`workers/src/handlers/user/received-cards/crud.ts`
- **新增**：`workers/src/utils/tags.ts`（標籤提取邏輯）

### 函式實作
```typescript
// workers/src/utils/tags.ts
const COMPANY_TYPE_KEYWORDS = {
  government: ['政府', '部會', '機關', '局', '署', '處'],
  listed: ['股份有限公司', '有限公司', 'Co., Ltd.', 'Inc.'],
  startup: ['新創', '創業', 'Startup'],
  ngo: ['基金會', '協會', '學會', '公會']
};

export function extractTagsFromOrganization(organization: string | null | undefined): string[] {
  if (!organization) return [];
  
  const tags = new Set<string>();
  const lowerOrg = organization.toLowerCase();
  
  for (const [type, keywords] of Object.entries(COMPANY_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerOrg.includes(keyword.toLowerCase())) {
        tags.add(type);
        break; // 每個類型只加一次
      }
    }
  }
  
  return Array.from(tags);
}
```

### 整合到 handleSaveCard
```typescript
// workers/src/handlers/user/received-cards/crud.ts
import { extractTagsFromOrganization } from '../../utils/tags';

export async function handleSaveCard(request: Request, env: Env): Promise<Response> {
  // ... 儲存名片邏輯 ...
  
  // 自動提取標籤（基於 organization）
  if (body.organization) {
    const tags = extractTagsFromOrganization(body.organization);
    
    if (tags.length > 0) {
      const statements = [];
      const now = Date.now();
      
      // 批次插入 card_tags
      for (const tag of tags) {
        statements.push(
          env.DB.prepare(`
            INSERT OR IGNORE INTO card_tags (card_uuid, tag, tag_source, created_at)
            VALUES (?, ?, 'auto_keyword', ?)
          `).bind(cardUuid, tag, now)
        );
      }
      
      await env.DB.batch(statements);
      
      // 更新統計（使用 COUNT 重算）
      for (const tag of tags) {
        await env.DB.prepare(`
          INSERT INTO tag_stats (user_email, tag, count, last_updated)
          VALUES (?, ?, 1, ?)
          ON CONFLICT(user_email, tag) DO UPDATE SET
            count = (
              SELECT COUNT(*) 
              FROM card_tags ct
              JOIN received_cards rc ON ct.card_uuid = rc.uuid
              WHERE ct.tag = excluded.tag 
                AND rc.user_email = excluded.user_email 
                AND rc.deleted_at IS NULL
            ),
            last_updated = excluded.last_updated
        `).bind(user.email, tag, now).run();
      }
    }
  }
  
  return jsonResponse({ uuid: cardUuid });
}
```

---

## Non-Goals (本階段不做)

- ❌ AI 標籤提取（Phase 2）
- ❌ 手動標籤 API（Week 2）
- ❌ 標籤管理 UI（Week 2）

---

## Technical Notes

1. **不區分大小寫**：
   - 使用 `toLowerCase()` 統一處理

2. **每個類型只匹配一次**：
   - 使用 `break` 避免重複

3. **Set 去重**：
   - 使用 `Set<string>` 避免重複標籤

4. **批次操作**：
   - 使用 `DB.batch()` 提升效能

5. **統計準確性**：
   - 使用 COUNT 重算而非 +1/-1
   - 避免並發問題

---

## Estimated Time: 2 hours

- 標籤提取函式：30 分鐘
- 整合到 handleSaveCard：1 小時
- 測試與驗證：30 分鐘
