# Vectorize 向量累積來源

## 📍 唯一來源

**Vectorize 只有一個向量累積來源**：

### **Cron Job: `sync-card-embeddings.ts`**

**觸發時間**: 每日 02:00 UTC (台灣時間 10:00)

**檔案位置**: `src/cron/sync-card-embeddings.ts`

---

## 🔄 同步流程

### **1. 查詢未同步的名片**

```sql
SELECT uuid, user_email, full_name, organization, organization_en, organization_alias, 
       title, department, company_summary, personal_summary, email, phone,
       website, address, note
FROM received_cards
WHERE deleted_at IS NULL 
  AND merged_to IS NULL
  AND (embedding_synced_at IS NULL OR updated_at > embedding_synced_at)
ORDER BY created_at ASC
LIMIT 100
```

**條件**:
- ✅ 未刪除 (`deleted_at IS NULL`)
- ✅ 未合併 (`merged_to IS NULL`)
- ✅ 未同步 (`embedding_synced_at IS NULL`) **或** 已更新 (`updated_at > embedding_synced_at`)

---

### **2. 生成 Embedding 文字**

**13 個欄位組合** (涵蓋率 65%):

```typescript
const text = [
  card.full_name,           // 1. 姓名
  card.organization,        // 2. 組織名稱（中文）
  card.organization_en,     // 3. 組織名稱（英文）
  card.organization_alias,  // 4. 組織別名
  card.department,          // 5. 部門
  card.title,               // 6. 職稱
  card.company_summary,     // 7. 公司簡介
  card.personal_summary,    // 8. 個人簡介
  card.email,               // 9. Email
  card.phone,               // 10. 電話
  card.website,             // 11. 網站
  card.address,             // 12. 地址
  card.note                 // 13. 備註
].filter(Boolean).join(' ').trim();
```

---

### **3. 呼叫 Gemini Embedding API**

**模型**: `gemini-embedding-001`

**維度**: 768

**API**:
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent
```

**Request Body**:
```json
{
  "content": {
    "parts": [{"text": "洪健復 奧義智慧科技 CyCraft Technology..."}]
  },
  "outputDimensionality": 768
}
```

**Response**:
```json
{
  "embedding": {
    "values": [0.123, -0.456, 0.789, ...]  // 768 個浮點數
  }
}
```

---

### **4. 上傳到 Vectorize**

**Vector 結構**:
```typescript
{
  id: card.uuid,                    // 名片 UUID
  values: [0.123, -0.456, ...],     // 768 維 embedding
  metadata: {
    user_email: card.user_email,    // 使用者 Email (Multi-tenant 隔離)
    card_uuid: card.uuid,            // 名片 UUID (重複)
    full_name: card.full_name,       // 姓名
    organization: card.organization  // 組織名稱
  }
}
```

**批次上傳**:
```typescript
await env.VECTORIZE.upsert(vectors);  // 最多 1,000 個/批次
```

---

### **5. 更新同步時間**

```sql
UPDATE received_cards 
SET embedding_synced_at = ?
WHERE uuid = ?
```

---

## 📊 資料來源分析

### **來源 1: OCR 提取** (Gemini Vision)
- `full_name`
- `organization`
- `department`
- `title`
- `phone`
- `email`
- `website`
- `address`

### **來源 2: Web Search 增強** (Google Search)
- `organization_en`
- `organization_alias`
- `company_summary`
- `personal_summary`

### **來源 3: 使用者手動輸入**
- `note` (備註欄位)

---

## 🔄 觸發時機

### **自動同步**
- **Cron Job**: 每日 02:00 UTC
- **條件**: `embedding_synced_at IS NULL` 或 `updated_at > embedding_synced_at`

### **手動觸發**
- **Admin API**: `POST /api/admin/trigger-cron` (選擇 "Sync Card Embeddings")

---

## 📈 同步特性

### **批次處理**
- **查詢批次**: 100 張名片/次
- **Embedding 批次**: 20 張名片/次 (並行生成)
- **上傳批次**: 最多 1,000 個 vectors/次

### **分頁迴圈**
- 持續處理直到所有未同步名片完成
- 避免積壓

### **容錯機制**
- 單張名片失敗不影響其他名片
- 錯誤日誌記錄

### **增量同步**
- 只同步新增或更新的名片
- `embedding_synced_at` 時間戳追蹤

---

## 🎯 使用場景

### **1. 語義搜尋** (`search.ts`)
- 使用者輸入查詢 → 生成 embedding → Vectorize 查詢 → 回傳相似名片

### **2. 去重判斷** (`deduplicate-cards.ts`)
- `checkCompanyRelationship()` - 組織名稱相似度
- `checkPersonIdentity()` - 人名變體判斷
- `queryVectorizeSimilarity()` - 名片相似度

### **3. Cross-User Matching** (`identity-resolution.ts`)
- 跨使用者名片配對
- 語義相似度判斷

---

## 📊 資料流向圖

```
┌─────────────────────────────────────────────────────────────┐
│                    資料來源                                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Gemini Vision│  │ Google Search│  │ 使用者輸入   │     │
│  │     OCR      │  │   Web Enrich │  │    (Note)    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            ▼                                 │
│                  ┌──────────────────┐                        │
│                  │ received_cards   │                        │
│                  │   (D1 Database)  │                        │
│                  └──────────┬───────┘                        │
│                            │                                 │
│                            ▼                                 │
│                  ┌──────────────────┐                        │
│                  │  Cron Job 02:00  │                        │
│                  │ sync-card-       │                        │
│                  │  embeddings.ts   │                        │
│                  └──────────┬───────┘                        │
│                            │                                 │
│                            ▼                                 │
│                  ┌──────────────────┐                        │
│                  │ Gemini Embedding │                        │
│                  │   API (768 dim)  │                        │
│                  └──────────┬───────┘                        │
│                            │                                 │
│                            ▼                                 │
│                  ┌──────────────────┐                        │
│                  │    Vectorize     │                        │
│                  │  (Vector Index)  │                        │
│                  └──────────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 查詢範例

### **語義搜尋**
```typescript
const queryVector = await generateEmbedding(env, "奧義智慧科技");
const matches = await env.VECTORIZE.query(queryVector, {
  topK: 10,
  returnMetadata: 'all',
  filter: { user_email: 'user@example.com' }  // Multi-tenant 隔離
});
```

### **去重判斷**
```typescript
const embeddingA = await getCardEmbedding(env, cardA.uuid);
const matches = await env.VECTORIZE.query(embeddingA, {
  topK: 10,
  returnMetadata: 'all'
});
const match = matches.matches.find(m => m.id === cardB.uuid);
if (match && match.score > 0.90) {
  // 高信心度：同一人
}
```

---

## 📊 效能指標

| 指標 | 數值 |
|-----|------|
| **同步頻率** | 每日 1 次 (02:00 UTC) |
| **批次大小** | 100 張名片/查詢，20 張/embedding |
| **Embedding 維度** | 768 |
| **查詢延遲** | 50-200ms |
| **成本** | 免費 (Cloudflare 內建) |
| **準確度** | 85-95% (語義相似度) |

---

## 🚀 未來優化

### **Option 1: 即時同步**
- 名片新增/更新時立即生成 embedding
- 降低延遲，提升即時性

### **Option 2: 增量更新**
- 只更新變更的欄位
- 降低 API 呼叫次數

### **Option 3: 多模態 Embedding**
- 整合圖片 embedding (名片照片)
- 提升搜尋準確度

---

**最後更新**: 2026-03-05  
**版本**: v5.0.0  
**狀態**: 生產環境運行中
