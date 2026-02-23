# Bilingual Card Support - Complete Specification

## 問題 3: 資料模型命名統一

### 決策：統一使用 `organization`

**理由**：
- 既有系統主欄位是 `organization`
- 避免混淆和映射錯誤
- 保持 domain 語意一致

**Schema**：
```sql
-- ✅ 正確
organization_zh TEXT
organization_en TEXT

-- ❌ 錯誤
company_zh TEXT
company_en TEXT
```

**API Contract**：
```json
{
  "organization_zh": "台灣科技股份有限公司",
  "organization_en": "Taiwan Tech Co., Ltd."
}
```

---

## 問題 4: 顯示規則完整定義

### 顯示優先順序

#### 列表頁
```typescript
function getDisplayName(card: ReceivedCard): string {
  // 1. 優先雙語（根據使用者語言偏好）
  const userLang = navigator.language.startsWith('zh') ? 'zh' : 'en';
  if (userLang === 'zh' && card.name_zh) return card.name_zh;
  if (userLang === 'en' && card.name_en) return card.name_en;
  
  // 2. 備用語言
  if (card.name_zh) return card.name_zh;
  if (card.name_en) return card.name_en;
  
  // 3. 向後相容
  return card.full_name || '(無名稱)';
}

function getDisplayOrganization(card: ReceivedCard): string {
  const userLang = navigator.language.startsWith('zh') ? 'zh' : 'en';
  if (userLang === 'zh' && card.organization_zh) return card.organization_zh;
  if (userLang === 'en' && card.organization_en) return card.organization_en;
  
  if (card.organization_zh) return card.organization_zh;
  if (card.organization_en) return card.organization_en;
  
  return card.organization || '';
}
```

#### 詳情頁（顯示所有語言）
```html
<div class="card-detail">
  <!-- 中文 -->
  <div v-if="card.name_zh || card.organization_zh">
    <h3>{{ card.name_zh }}</h3>
    <p>{{ card.title_zh }} @ {{ card.organization_zh }}</p>
    <p>{{ card.address_zh }}</p>
  </div>
  
  <!-- 英文 -->
  <div v-if="card.name_en || card.organization_en">
    <h3>{{ card.name_en }}</h3>
    <p>{{ card.title_en }} @ {{ card.organization_en }}</p>
    <p>{{ card.address_en }}</p>
  </div>
  
  <!-- 向後相容 -->
  <div v-if="!card.name_zh && !card.name_en">
    <h3>{{ card.full_name }}</h3>
    <p>{{ card.title }} @ {{ card.organization }}</p>
    <p>{{ card.address }}</p>
  </div>
</div>
```

### 搜尋索引

#### 前端搜尋（現有）
```typescript
function filterCards(keyword: string, cards: ReceivedCard[]): ReceivedCard[] {
  const lowerKeyword = keyword.toLowerCase();
  
  return cards.filter(card => {
    // 搜尋所有語言欄位
    return (
      card.full_name?.toLowerCase().includes(lowerKeyword) ||
      card.name_zh?.toLowerCase().includes(lowerKeyword) ||
      card.name_en?.toLowerCase().includes(lowerKeyword) ||
      card.organization?.toLowerCase().includes(lowerKeyword) ||
      card.organization_zh?.toLowerCase().includes(lowerKeyword) ||
      card.organization_en?.toLowerCase().includes(lowerKeyword) ||
      card.title?.toLowerCase().includes(lowerKeyword) ||
      card.title_zh?.toLowerCase().includes(lowerKeyword) ||
      card.title_en?.toLowerCase().includes(lowerKeyword) ||
      card.email?.toLowerCase().includes(lowerKeyword)
    );
  });
}
```

#### 後端搜尋（未來）
```sql
-- 全文搜尋索引（SQLite FTS5）
CREATE VIRTUAL TABLE received_cards_fts USING fts5(
  card_uuid,
  full_name,
  name_zh,
  name_en,
  organization,
  organization_zh,
  organization_en,
  title,
  title_zh,
  title_en,
  email,
  content='received_cards'
);

-- 搜尋查詢
SELECT * FROM received_cards_fts 
WHERE received_cards_fts MATCH ?
ORDER BY rank;
```

---

## 問題 5: 反面圖片生命週期

### 檔案清理策略

#### 1. 軟刪除（立即）
```typescript
// 標記刪除，保留 30 天
await env.DB.prepare(`
  UPDATE received_cards 
  SET deleted_at = ?
  WHERE card_uuid = ? AND user_email = ?
`).bind(Date.now(), card_uuid, user.email).run();
```

#### 2. 定期清理（Cron Job）
```typescript
// workers/src/cron/cleanup-deleted-cards.ts
export async function cleanupDeletedCards(env: Env) {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  
  // 1. 查詢待刪除的名片
  const deletedCards = await env.DB.prepare(`
    SELECT 
      card_uuid,
      image_url, 
      back_image_url, 
      thumbnail_url, 
      back_thumbnail_url
    FROM received_cards
    WHERE deleted_at IS NOT NULL 
      AND deleted_at < ?
  `).bind(thirtyDaysAgo).all();
  
  // 2. 刪除 R2 檔案
  for (const card of deletedCards.results) {
    const deletePromises = [
      env.R2_BUCKET.delete(card.image_url),
      env.R2_BUCKET.delete(card.thumbnail_url)
    ];
    
    if (card.back_image_url) {
      deletePromises.push(env.R2_BUCKET.delete(card.back_image_url));
    }
    if (card.back_thumbnail_url) {
      deletePromises.push(env.R2_BUCKET.delete(card.back_thumbnail_url));
    }
    
    await Promise.allSettled(deletePromises);
  }
  
  // 3. 永久刪除資料庫記錄
  await env.DB.prepare(`
    DELETE FROM received_cards
    WHERE deleted_at IS NOT NULL 
      AND deleted_at < ?
  `).bind(thirtyDaysAgo).run();
  
  console.log(`[Cleanup] Deleted ${deletedCards.results.length} cards`);
}
```

#### 3. 替換上傳（清理舊檔）
```typescript
export async function replaceCardImage(
  env: Env,
  card_uuid: string,
  user_email: string,
  new_front_image: File,
  new_back_image?: File
) {
  // 1. 查詢舊檔案
  const oldCard = await env.DB.prepare(`
    SELECT 
      image_url, 
      back_image_url, 
      thumbnail_url, 
      back_thumbnail_url
    FROM received_cards
    WHERE card_uuid = ? AND user_email = ? AND deleted_at IS NULL
  `).bind(card_uuid, user_email).first();
  
  if (!oldCard) {
    throw new Error('Card not found');
  }
  
  // 2. 上傳新檔案
  const timestamp = Date.now();
  const newFrontKey = `uploads/${user_email}/${card_uuid}-front-${timestamp}`;
  const newBackKey = new_back_image 
    ? `uploads/${user_email}/${card_uuid}-back-${timestamp}` 
    : null;
  
  await env.R2_BUCKET.put(newFrontKey, new_front_image);
  if (new_back_image && newBackKey) {
    await env.R2_BUCKET.put(newBackKey, new_back_image);
  }
  
  // 3. 生成新縮圖
  const newFrontThumbnail = await generateThumbnail(new_front_image);
  const newBackThumbnail = new_back_image 
    ? await generateThumbnail(new_back_image) 
    : null;
  
  const newFrontThumbnailKey = `thumbnails/${user_email}/${card_uuid}-front-${timestamp}`;
  const newBackThumbnailKey = newBackThumbnail 
    ? `thumbnails/${user_email}/${card_uuid}-back-${timestamp}` 
    : null;
  
  await env.R2_BUCKET.put(newFrontThumbnailKey, newFrontThumbnail);
  if (newBackThumbnail && newBackThumbnailKey) {
    await env.R2_BUCKET.put(newBackThumbnailKey, newBackThumbnail);
  }
  
  // 4. 更新資料庫
  await env.DB.prepare(`
    UPDATE received_cards
    SET 
      image_url = ?,
      back_image_url = ?,
      thumbnail_url = ?,
      back_thumbnail_url = ?,
      updated_at = ?
    WHERE card_uuid = ? AND user_email = ?
  `).bind(
    newFrontKey,
    newBackKey,
    newFrontThumbnailKey,
    newBackThumbnailKey,
    timestamp,
    card_uuid,
    user_email
  ).run();
  
  // 5. 非同步刪除舊檔案
  const deletePromises = [
    env.R2_BUCKET.delete(oldCard.image_url),
    env.R2_BUCKET.delete(oldCard.thumbnail_url)
  ];
  
  if (oldCard.back_image_url) {
    deletePromises.push(env.R2_BUCKET.delete(oldCard.back_image_url));
  }
  if (oldCard.back_thumbnail_url) {
    deletePromises.push(env.R2_BUCKET.delete(oldCard.back_thumbnail_url));
  }
  
  // 不等待刪除完成（非阻塞）
  Promise.allSettled(deletePromises).catch(err => {
    console.error('[ReplaceImage] Failed to delete old files:', err);
  });
}
```

#### 4. 孤兒檔案清理（每週）
```typescript
// 清理沒有對應資料庫記錄的檔案
export async function cleanupOrphanFiles(env: Env) {
  // 1. 列出所有 R2 檔案
  const allFiles = await env.R2_BUCKET.list({ prefix: 'uploads/' });
  
  // 2. 查詢所有有效的 image_url
  const validUrls = new Set();
  const cards = await env.DB.prepare(`
    SELECT image_url, back_image_url, thumbnail_url, back_thumbnail_url
    FROM received_cards
    WHERE deleted_at IS NULL
  `).all();
  
  cards.results.forEach(card => {
    if (card.image_url) validUrls.add(card.image_url);
    if (card.back_image_url) validUrls.add(card.back_image_url);
    if (card.thumbnail_url) validUrls.add(card.thumbnail_url);
    if (card.back_thumbnail_url) validUrls.add(card.back_thumbnail_url);
  });
  
  // 3. 刪除孤兒檔案
  const orphans = allFiles.objects.filter(obj => !validUrls.has(obj.key));
  for (const orphan of orphans) {
    await env.R2_BUCKET.delete(orphan.key);
  }
  
  console.log(`[Cleanup] Deleted ${orphans.length} orphan files`);
}
```

---

## 問題 6: LLM 輸出可信度與衝突處理

### Schema 擴充
```sql
-- 已在 Migration 0029 新增
ALTER TABLE received_cards ADD COLUMN ai_confidence REAL DEFAULT 0.0;  -- 0.0-1.0
ALTER TABLE received_cards ADD COLUMN data_source TEXT DEFAULT 'manual';  -- manual, ocr, llm, user_edit
```

### 資料來源優先順序
```
user_edit > manual > llm > ocr
```

### API 回應包含可信度
```json
{
  "card_uuid": "uuid",
  "name_zh": "王小明",
  "name_en": "Wang Xiao-Ming",
  "ai_confidence": 0.95,
  "data_source": "llm",
  "fields_confidence": {
    "name_zh": 0.98,
    "name_en": 0.92,
    "organization_zh": 0.95,
    "organization_en": 0.90
  }
}
```

### 衝突處理規則
```typescript
function mergeCardData(
  existing: ReceivedCard,
  aiResult: AIResult
): ReceivedCard {
  // 規則 1：使用者編輯過的欄位不覆蓋
  if (existing.data_source === 'user_edit') {
    return existing;
  }
  
  // 規則 2：高信心度的 AI 結果覆蓋低信心度
  if (aiResult.confidence > existing.ai_confidence) {
    return {
      ...existing,
      ...aiResult.data,
      ai_confidence: aiResult.confidence,
      data_source: 'llm'
    };
  }
  
  // 規則 3：保留既有資料
  return existing;
}
```

### UI 顯示可信度
```html
<div class="card-field">
  <label>姓名</label>
  <input v-model="card.name_zh" />
  
  <!-- 顯示 AI 信心分數 -->
  <span v-if="card.data_source === 'llm'" class="confidence-badge">
    AI 識別 ({{ (card.ai_confidence * 100).toFixed(0) }}%)
  </span>
  
  <!-- 低信心度警告 -->
  <span v-if="card.ai_confidence < 0.7" class="warning">
    ⚠️ 建議人工確認
  </span>
</div>
```

---

## 總結

### 完整的資料流程

```
1. 使用者上傳正反面圖片
   ↓
2. 後端驗證（MIME + 魔術位元 + 大小）
   ↓
3. 上傳到 R2（租戶隔離）
   ↓
4. 生成縮圖
   ↓
5. 記錄到資料庫（data_source='manual', ai_confidence=0.0）
   ↓
6. [未來] 呼叫 LLM API
   ↓
7. [未來] 更新資料庫（data_source='llm', ai_confidence=0.95）
   ↓
8. 使用者編輯
   ↓
9. 更新資料庫（data_source='user_edit', ai_confidence=1.0）
```

### 安全保證
- ✅ 檔案類型驗證（MIME + 魔術位元）
- ✅ 檔案大小限制（10MB）
- ✅ 租戶隔離（user_email 綁定）
- ✅ URL 安全（內部 key，不直接暴露）
- ✅ 補償流程（上傳失敗清理）
- ✅ 定期清理（軟刪除 30 天後永久刪除）

### 資料一致性
- ✅ Backfill 策略（full_name → name_zh）
- ✅ 向後相容（保留舊欄位）
- ✅ 顯示優先順序（雙語 > 單語）
- ✅ 搜尋索引（包含所有語言）
- ✅ 資料來源追蹤（data_source）
- ✅ 信心分數（ai_confidence）
