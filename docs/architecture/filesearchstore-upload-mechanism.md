# FileSearchStore 上傳機制分析

## 📍 位置
**檔案**: `src/handlers/user/received-cards/unified-extract.ts`

---

## 🔄 觸發時機

**時間點**: 名片 OCR + Enrich 完成後（步驟 9）

**條件**:
```typescript
if (env.FILE_SEARCH_STORE_NAME && result.organization) {
  ctx.waitUntil(
    uploadToFileSearchStore(result, env.GEMINI_API_KEY, env.FILE_SEARCH_STORE_NAME)
      .catch(error => {
        console.error('[FileSearchStore] Upload failed:', error);
      })
  );
}
```

**特性**:
- ✅ **非阻塞**: 使用 `ctx.waitUntil()` 背景執行
- ✅ **容錯**: 上傳失敗不影響主流程
- ✅ **條件觸發**: 只有當組織名稱存在時才上傳

---

## 📦 上傳內容格式

### **文件內容** (純文字)

```typescript
const content = `
Organization: ${data.organization}${data.organization_en ? ` (${data.organization_en})` : ''}
${data.organization_alias?.length ? `Aliases: ${data.organization_alias.join(', ')}` : ''}

Company Summary:
${data.company_summary || ''}

${data.full_name && data.personal_summary ? `
Professional Staff:
- ${data.full_name}${data.department || data.title ? ` (${data.department || data.title})` : ''}: ${data.personal_summary}
` : ''}

Sources:
${data.sources?.map(s => `- ${s.title}: ${s.uri}`).join('\n') || ''}
`.trim();
```

### **範例**:
```
Organization: 奧義智慧科技 (CyCraft Technology)
Aliases: CyCraft, 奧義科技

Company Summary:
奧義智慧科技是台灣領先的資安公司，專注於威脅獵捕與事件應變服務。

Professional Staff:
- 洪健復 (技術長): 資安專家，專長威脅情報分析與惡意程式逆向工程。

Sources:
- CyCraft Official Website: https://cycraft.com
- LinkedIn Company Page: https://linkedin.com/company/cycraft
```

---

## 📋 Metadata 結構

```typescript
const metadata = {
  displayName: `${data.organization}_${new Date().toISOString().split('T')[0]}`,
  customMetadata: [
    {key: "organization", stringValue: data.organization},
    {key: "organization_en", stringValue: data.organization_en || ""}
  ]
};
```

**範例**:
```json
{
  "displayName": "奧義智慧科技_2026-03-05",
  "customMetadata": [
    {"key": "organization", "stringValue": "奧義智慧科技"},
    {"key": "organization_en", "stringValue": "CyCraft Technology"}
  ]
}
```

---

## 🌐 API 端點

**URL**:
```
https://generativelanguage.googleapis.com/upload/v1beta/{storeName}:uploadToFileSearchStore?key={apiKey}
```

**方法**: `POST`

**Headers**:
```
X-Goog-Upload-Protocol: multipart
```

**Body**: `FormData`
- `metadata`: JSON 字串
- `file`: Blob (text/plain)

---

## 📊 資料來源

### **UnifiedExtractResult** 欄位

| 欄位 | 來源 | 用途 |
|-----|------|------|
| `organization` | Gemini Vision OCR | 組織名稱（中文） |
| `organization_en` | Google Search | 組織名稱（英文） |
| `organization_alias` | Google Search | 組織別名陣列 |
| `company_summary` | Google Search | 公司簡介 (100-200 字) |
| `full_name` | Gemini Vision OCR | 人名 |
| `department` | Gemini Vision OCR | 部門 |
| `title` | Gemini Vision OCR | 職稱 |
| `personal_summary` | Google Search | 個人簡介 (30-50 字) |
| `sources` | Google Search | 資料來源 URL |

---

## 🎯 設計目的

### **知識累積**
- 每次上傳新名片時，自動累積組織知識
- 後續名片可以從 FileSearchStore 查詢相關資訊

### **去重增強**
- 在 50-90 分數區間使用 FileSearchStore 判斷：
  - 公司關係 (`checkCompanyRelationship`)
  - 人名變體 (`checkPersonIdentity`)

### **協同學習**
- 跨使用者共享組織知識
- 隨著使用量增加，知識庫自動成長

---

## ⚠️ 當前狀態

**已停用** (2026-03-05)

**原因**: Gemini API 限制 - 無法同時使用 `file_search` + `google_search`

**替代方案**: Vectorize (已實作)

---

## 🔄 Vectorize 替代方案對比

| 特性 | FileSearchStore | Vectorize |
|-----|----------------|-----------|
| **上傳時機** | 每次 OCR 完成 | 每日 02:00 Cron |
| **上傳內容** | 純文字文件 | 768 維 Embedding |
| **查詢方式** | Gemini API (LLM) | Cosine Similarity |
| **延遲** | 2-5s | 50-200ms |
| **成本** | Gemini API | 零 |
| **準確度** | 90%+ (LLM 推論) | 85-95% (語義相似度) |

---

## 💡 未來考量

### **Option 1: 保留上傳邏輯**
- 等待 Gemini API 支援 `file_search` + `google_search` 同時使用
- 屆時可以重新啟用 FileSearchStore

### **Option 2: 完全移除**
- Vectorize 已滿足需求
- 簡化架構，降低維護成本

### **建議**: 保留代碼但註解，等待 Gemini API 更新

---

## 📝 相關代碼位置

- **上傳函式**: `src/handlers/user/received-cards/unified-extract.ts:93-153`
- **觸發邏輯**: `src/handlers/user/received-cards/unified-extract.ts:527-534`
- **查詢邏輯**: `src/cron/deduplicate-cards.ts` (已改用 Vectorize)
- **清理 Cron**: `src/cron/cleanup-filesearchstore.ts` (2 年 TTL)

---

**最後更新**: 2026-03-05  
**狀態**: 已停用，改用 Vectorize
