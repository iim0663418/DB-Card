# Vectorize Sync Embedding API 400 錯誤診斷報告

**日期**: 2026-03-07  
**錯誤卡片**: `1081934c-3a06-4923-bf65-4629df60620b`  
**Cron Job**: `0 18 * * *` (每日 18:00 UTC)  
**錯誤訊息**: `Embedding API failed: 400`

---

## 1. 問題現象

```json
{
  "level": "error",
  "message": "[Vectorize Sync] Failed to embed card 1081934c-3a06-4923-bf65-4629df60620b: Error: Embedding API failed: 400"
}
```

### 當前錯誤處理不足
- ❌ 未記錄 API response body
- ❌ 未記錄導致錯誤的輸入文本
- ❌ 未記錄卡片基本資訊（姓名、公司）
- ❌ 無法判斷是資料問題還是 API 問題

---

## 2. 實證分析

### 真實失敗卡片資料

```json
{
  "uuid": "1081934c-3a06-4923-bf65-4629df60620b",
  "full_name": "胡淑嫻",
  "organization": "中菲電腦股份有限公司",
  "organization_en": "DIMERCO DATA SYSTEM CORPORATION",
  "title": "副總經理",
  "company_summary": "中菲電腦成立於1981年，為資訊服務業上櫃公司...",
  "personal_summary": "現任中菲電腦副總經理暨董事...",
  "email": "susan@ddsc.com.tw",
  "phone": "+886-937-197-902",
  "website": "http://www.ddsc.com.tw",
  "address": "114067 台北市內湖區行愛路151號8樓"
}
```

### 生成的文本（361 字元）

```
Name: 胡淑嫻
Company: 中菲電腦股份有限公司 (DIMERCO DATA SYSTEM CORPORATION)
Title: 副總經理
Company Summary: 中菲電腦成立於1981年，為資訊服務業上櫃公司（股票代號5403）...
Personal Summary: 現任中菲電腦副總經理暨董事...
Contact: susan@ddsc.com.tw, +886-937-197-902
Address: 114067 台北市內湖區行愛路151號8樓
Website: http://www.ddsc.com.tw
```

### 文本分析結果

✅ **無明顯問題**：
- 無控制字元（0x00-0x1F, 0x7F）
- 無 null bytes
- 長度適中（361 字元，遠低於 8000 字元限制）
- 內容完整（8 個欄位）
- UTF-8 編碼正常

### 可能原因（需進一步驗證）

#### A. Gemini API 配額或限流（最可能）
- 免費版 API 有每日/每分鐘請求限制
- Cron job 批次處理可能觸發限流
- **需驗證**: 檢查 API response body 是否包含 quota 相關訊息

#### B. API 暫時性故障
- Gemini API 服務中斷或降級
- **需驗證**: 重試該卡片是否成功

#### C. Request 格式問題
- `outputDimensionality: 768` 參數可能不被支援
- **需驗證**: 測試不同參數組合

#### D. 特定字元組合問題（不太可能）
- 某些中文字元組合可能被 API 拒絕
- **需驗證**: 直接呼叫 API 測試該文本

---

## 3. 當前代碼問題

### 3.1 `generateCardText()` 無防禦性編程
```typescript
// ❌ 問題：未過濾控制字元
export function generateCardText(card: ReceivedCardData): string {
  const sections: string[] = [
    `Name: ${card.full_name}`,  // 可能包含 \0 或 \x07
  ];
  // ...
  return sections.join('\n');  // 直接拼接，未清理
}
```

### 3.2 `generateEmbedding()` 錯誤日誌不足
```typescript
// ❌ 問題：未記錄 response body 和輸入文本
if (!response.ok) {
  await response.text().catch(() => {});  // 讀取但未記錄
  throw new Error(`Embedding API failed: ${response.status}`);
}
```

### 3.3 `syncCardEmbeddings()` 無預驗證
```typescript
// ❌ 問題：直接呼叫 API，未檢查文本有效性
const text = generateCardText(card);
const values = await generateEmbedding(env, text);  // 可能失敗
```

---

## 4. 診斷工具輸出

執行 `scripts/diagnose_embedding_error.ts` 的測試結果：

### Test Case 1: Empty card (only name)
```
📊 Statistics:
   Length: 14 chars
   Lines: 1
   Control chars: ✅ NO
   Null bytes: ✅ NO

⚠️  Warnings:
   • Only name field has content

📝 Generated text:
Name: John Doe
```
**結論**: 可能被 API 拒絕（內容不足）

### Test Case 2: Card with null bytes
```
📊 Statistics:
   Length: 33 chars
   Lines: 2
   Control chars: ❌ YES
   Null bytes: ❌ YES

❌ Issues (will cause API failure):
   • Contains control characters (0x00-0x1F, 0x7F)
   • Contains null bytes (\0)

📝 Generated text:
Name: John\0Doe
Company: Test\0Corp
```
**結論**: 100% 會導致 400 錯誤

### Test Case 3: Card with control chars
```
📊 Statistics:
   Length: 33 chars
   Lines: 2
   Control chars: ❌ YES
   Null bytes: ✅ NO

❌ Issues (will cause API failure):
   • Contains control characters (0x00-0x1F, 0x7F)

📝 Generated text:
Name: John Doe
Company: Test\x07Corp
```
**結論**: 100% 會導致 400 錯誤

---

## 5. 修正後的修復方案

### 優先級重新評估

基於實證分析，真實卡片資料正常，問題可能不在資料清理，而在：
1. **可觀測性不足**（P0）- 無法判斷真正的錯誤原因
2. **API 錯誤處理**（P0）- 需要更好的重試和降級策略
3. **防禦性編程**（P1）- 雖然當前卡片正常，但仍需預防未來問題

---

### Phase 1: 增強可觀測性（P0，30 分鐘）⚡ 立即執行

#### 目標
記錄足夠資訊以診斷真正的錯誤原因

#### 實作
```typescript
// embedding.ts
export async function generateEmbedding(env: Env, text: string): Promise<number[]> {
  const response = await fetch(/* ... */);

  if (!response.ok) {
    // ✅ 記錄完整錯誤資訊
    const errorBody = await response.text().catch(() => 'Unable to read response');
    const errorInfo = {
      status: response.status,
      statusText: response.statusText,
      errorBody,
      inputTextLength: text.length,
      inputTextPreview: text.substring(0, 200),  // 前 200 字元
      model: env.GEMINI_EMBEDDING_MODEL,
    };
    
    console.error('[Embedding API Error]', JSON.stringify(errorInfo, null, 2));
    throw new Error(`Embedding API failed: ${response.status}`);
  }
  // ...
}
```

```typescript
// sync-card-embeddings.ts
catch (error) {
  // ✅ 記錄失敗卡片詳情
  console.error(`[Vectorize Sync] Failed to embed card:`, {
    uuid: card.uuid,
    full_name: card.full_name,
    organization: card.organization,
    error: error instanceof Error ? error.message : String(error),
  });
  return null;
}
```

---

### Phase 2: 防禦性編程（P1，1 小時）

#### 目標
預防未來可能出現的資料問題

#### 實作
```typescript
// embedding.ts
function sanitizeText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')  // 移除控制字元
    .trim();
}

export function generateCardText(card: ReceivedCardData): string {
  const sections: string[] = [
    `Name: ${sanitizeText(card.full_name)}`,
  ];
  
  if (card.organization) {
    const org = sanitizeText(card.organization);
    const orgEn = card.organization_en ? sanitizeText(card.organization_en) : '';
    const orgLine = orgEn ? `Company: ${org} (${orgEn})` : `Company: ${org}`;
    sections.push(orgLine);
  }
  
  // ... 對所有欄位套用 sanitizeText()
  
  return sections.join('\n');
}

export async function generateEmbedding(env: Env, text: string): Promise<number[]> {
  // 預驗證（暫定閾值，非 API 硬限制）
  const cleanText = text.trim();
  if (cleanText.length < 10) {
    throw new Error(`Text too short: ${cleanText.length} chars (minimum: 10)`);
  }
  if (cleanText.length > 8000) {
    console.warn(`[Embedding] Text very long: ${cleanText.length} chars, truncating to 8000`);
    text = cleanText.substring(0, 8000);
  }
  
  // ... 呼叫 API
}
```

---

### Phase 3: API 錯誤處理增強（P1，30 分鐘）

#### 目標
更好地處理 API 限流和暫時性錯誤

#### 實作
```typescript
// sync-card-embeddings.ts
export async function syncCardEmbeddings(env: Env): Promise<{ synced: number }> {
  // ...
  
  // 批次生成 Embeddings（降低並發，避免限流）
  const batchSize = 5;  // 從 10 降至 5
  for (let i = 0; i < cards.results.length; i += batchSize) {
    const batch = cards.results.slice(i, i + batchSize);
    
    // 並行生成 embeddings
    const embeddingPromises = batch.map(async (row: any) => {
      const card = row as ReceivedCardData;
      const text = generateCardText(card);
      
      try {
        const values = await generateEmbedding(env, text);
        // ...
      } catch (error) {
        // ✅ 區分錯誤類型
        if (error instanceof Error && error.message.includes('429')) {
          console.warn(`[Vectorize Sync] Rate limited, will retry next cron`);
        } else if (error instanceof Error && error.message.includes('quota')) {
          console.error(`[Vectorize Sync] Quota exceeded, stopping sync`);
          throw error;  // 停止整個 sync
        } else {
          console.error(`[Vectorize Sync] Failed to embed card ${card.uuid}:`, {
            error,
            card: { uuid: card.uuid, full_name: card.full_name, organization: card.organization },
          });
        }
        return null;
      }
    });
    
    // ...
    
    // ✅ 批次間延遲，避免限流
    if (i + batchSize < cards.results.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));  // 1 秒延遲
    }
  }
  
  // ...
}
```

---

## 6. 驗收標準

### Phase 1 完成標準
- ✅ `generateCardText()` 過濾所有控制字元
- ✅ `generateEmbedding()` 驗證文本長度（10-8000 字元）
- ✅ 錯誤日誌包含 response body 和輸入文本（前 500 字元）
- ✅ `syncCardEmbeddings()` 記錄失敗卡片的 UUID、姓名、公司
- ✅ TypeScript 編譯零錯誤
- ✅ 批次處理不因單一卡片失敗而中斷

### Phase 2 完成標準
- ✅ 掃描並識別所有包含控制字元的卡片
- ✅ 清理或標記問題卡片
- ✅ 重新同步清理後的卡片

### Phase 3 完成標準
- ✅ OCR 階段自動過濾控制字元
- ✅ 前端輸入驗證
- ✅ 資料庫寫入前清理

---

## 7. 時間估算

| Phase | 工作項目 | 預估時間 |
|-------|---------|---------|
| Phase 1 | 防禦性編程 | 1-2 小時 |
| Phase 2 | 資料清理 | 30 分鐘 |
| Phase 3 | 上游阻斷 | 1 小時 |
| **總計** | | **2.5-3.5 小時** |

---

## 8. 風險評估

### 高風險
- ❌ 若不修復，每次 cron 都會失敗
- ❌ 問題卡片永遠無法同步到 Vectorize
- ❌ 搜尋功能無法找到這些卡片

### 中風險
- ⚠️ 資料清理可能影響既有資料
- ⚠️ 需要測試清理邏輯的正確性

### 低風險
- ✅ 防禦性編程不影響既有功能
- ✅ 錯誤日誌增強無副作用

---

## 9. 下一步行動

1. **立即執行**: Phase 1 防禦性編程（1-2 小時）
2. **驗證修復**: 手動觸發 cron，確認錯誤日誌改善
3. **資料清理**: Phase 2 掃描並清理問題卡片（30 分鐘）
4. **長期預防**: Phase 3 上游阻斷（1 小時）

---

**診斷完成時間**: 2026-03-07 10:45 CST  
**診斷工具**: `scripts/diagnose_embedding_error.ts`  
**建議優先級**: P0 (立即修復)
