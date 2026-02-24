# Task: FileSearchStore Integration - 修正後的完整規劃

## 🚨 Blockers 修正

### Blocker 1: ctx.waitUntil() 簽名問題
**問題**：handler 只有 (request, env)，缺少 ctx 參數
**解決**：
1. 修改 `unified-extract.ts` handler 簽名：`(request, env, ctx)`
2. 修改 `index.ts` 路由呼叫：傳入 `c.executionCtx`

### Blocker 2: Env 型別缺少 FILE_SEARCH_STORE_NAME
**問題**：`types.ts` 未定義此欄位
**解決**：在 `types.ts` 加入 `FILE_SEARCH_STORE_NAME?: string`

### Medium 3: production vars 遺漏
**問題**：只改了 [vars]，未改 env.production.vars
**解決**：同時更新 production 環境變數

### Medium 4: 缺少成功日誌
**問題**：只有失敗 log，沒有成功 log
**解決**：加入成功上傳日誌

---

## 🏗️ 修正後的實作計畫（1.5 小時）

### Step 1: 環境變數與型別配置（10 分鐘）

#### 1.1 修改 types.ts
```typescript
// src/types.ts (Line 4-22)
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  GEMINI_API_KEY: string;
  SETUP_TOKEN: string;
  KEK: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  FILE_SEARCH_STORE_NAME?: string;  // 新增
}
```

#### 1.2 修改 wrangler.toml
```toml
# Line 7-8 (Staging)
[vars]
FILE_SEARCH_STORE_NAME = "fileSearchStores/dbcard-knowledge-base-fpyodw69c4ua"

# Line 53-56 (Production)
[env.production.vars]
FILE_SEARCH_STORE_NAME = "fileSearchStores/dbcard-knowledge-base-fpyodw69c4ua"
```

#### 1.3 修改 .dev.vars
```bash
FILE_SEARCH_STORE_NAME="fileSearchStores/dbcard-knowledge-base-fpyodw69c4ua"
```

---

### Step 2: 修改 Handler 簽名（10 分鐘）

#### 2.1 修改 unified-extract.ts
```typescript
// Line 289 (修改前)
export async function handleUnifiedExtract(request: Request, env: Env): Promise<Response>

// Line 289 (修改後)
export async function handleUnifiedExtract(
  request: Request, 
  env: Env, 
  ctx: ExecutionContext
): Promise<Response>
```

#### 2.2 修改 index.ts 路由呼叫
```typescript
// Line 347-348 (修改前)
app.post('/api/user/unified-extract', async (c) => {
  return handleUnifiedExtract(c.req.raw, c.env);
});

// Line 347-348 (修改後)
app.post('/api/user/unified-extract', async (c) => {
  return handleUnifiedExtract(c.req.raw, c.env, c.executionCtx);
});
```

---

### Step 3: 上傳函式實作（30 分鐘）

**檔案**：`src/handlers/user/received-cards/unified-extract.ts`

**新增函式**（在 performUnifiedExtract 之前）：
```typescript
/**
 * Upload company knowledge to FileSearchStore
 */
async function uploadToFileSearchStore(
  data: UnifiedExtractResult,
  apiKey: string,
  storeName: string
): Promise<void> {
  // 組合文件內容
  const content = `
公司名稱：${data.organization}（${data.organization_en || ''}）
${data.organization_alias?.length ? `別名：${data.organization_alias.join('、')}` : ''}

公司摘要：
${data.company_summary || ''}

${data.full_name && data.personal_summary ? `
專業人員：
- ${data.full_name}（${data.department || data.title || ''}）：${data.personal_summary}
` : ''}

來源：
${data.sources?.map(s => `- ${s.title}: ${s.uri}`).join('\n') || ''}
  `.trim();

  // 準備 metadata
  const displayName = `${data.organization}_${new Date().toISOString().split('T')[0]}`;
  const metadata = {
    displayName,
    customMetadata: [
      {key: "organization", stringValue: data.organization},
      {key: "organization_en", stringValue: data.organization_en || ""}
    ]
  };

  // 上傳到 FileSearchStore
  const formData = new FormData();
  formData.append('metadata', JSON.stringify(metadata));
  formData.append('file', new Blob([content], {type: 'text/plain'}));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/${storeName}:uploadToFileSearchStore?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'multipart'
      },
      body: formData
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed (${response.status}): ${errorText}`);
  }

  // 成功日誌
  console.log(`[FileSearchStore] Uploaded: ${displayName} (${content.length} bytes)`);
}
```

---

### Step 4: 整合到 handleUnifiedExtract（10 分鐘）

**修改位置**：`handleUnifiedExtract()` 函式末尾（return 之前）

```typescript
// 執行 OCR
const result = await retryWithBackoff(() => 
  performUnifiedExtract(imageBase64, mimeType, env.GEMINI_API_KEY)
);

// 更新資料庫狀態
await env.DB.prepare(
  'UPDATE temp_uploads SET ocr_status = ?, ocr_result = ?, updated_at = ? WHERE id = ?'
).bind('completed', JSON.stringify(result), Date.now(), uploadId).run();

// 非阻塞上傳到 FileSearchStore
if (env.FILE_SEARCH_STORE_NAME && result.organization) {
  ctx.waitUntil(
    uploadToFileSearchStore(result, env.GEMINI_API_KEY, env.FILE_SEARCH_STORE_NAME)
      .catch(err => console.error('[FileSearchStore] Upload failed:', err.message))
  );
}

return Response.json(result);
```

---

### Step 5: 測試驗證（30 分鐘）

#### 5.1 TypeScript 編譯檢查
```bash
cd /Users/shengfanwu/GitHub/DB-Card/workers
npm run typecheck
```

#### 5.2 本地測試
```bash
npm run dev
```

**測試步驟**：
1. 上傳一張名片圖片
2. 檢查 console 日誌：
   - ✅ `[FileSearchStore] Uploaded: 台積電_2026-02-24 (443 bytes)`
   - 或 ❌ `[FileSearchStore] Upload failed: ...`
3. 驗證 OCR 結果正常返回

#### 5.3 Staging 部署測試
```bash
wrangler deploy
```

**驗證步驟**：
1. 上傳名片到 Staging
2. 查詢 FileSearchStore 文件數量：
```bash
curl "https://generativelanguage.googleapis.com/v1beta/fileSearchStores/dbcard-knowledge-base-fpyodw69c4ua?key=$GEMINI_API_KEY" | jq '.activeDocumentsCount'
```

3. 使用 Gemini 3.0 查詢測試：
```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "台積電的主要業務是什麼？"}]}],
    "tools": [{"fileSearch": {"fileSearchStoreNames": ["fileSearchStores/dbcard-knowledge-base-fpyodw69c4ua"]}}]
  }' | jq -r '.candidates[0].content.parts[0].text'
```

---

### Step 6: 文檔更新（10 分鐘）

#### 6.1 更新 README.md
```markdown
### FileSearchStore 知識庫
- 自動將公司資訊上傳到 Gemini FileSearchStore
- 累積可複用的公司知識（公司名稱、別名、專業人員）
- 支援語義搜尋（gemini-3-flash-preview）
- 非阻塞上傳，不影響用戶體驗
```

#### 6.2 更新 knowledge_graph.mem
```
260224|FileSearchStore|integration|Auto_Upload_Company_Knowledge
260224|FileSearchStore|content|Organization_Alias_Personal_Summary_Sources
260224|FileSearchStore|metadata|Organization_Organization_En
260224|unified_extract_ts|enhancement|Non_Blocking_Upload_ctx_waitUntil
260224|unified_extract_ts|signature|Added_ExecutionContext_Parameter
260224|types_ts|env|FILE_SEARCH_STORE_NAME_Optional
260224|Gemini|model|gemini_3_flash_preview_Verified
```

---

## 🎯 驗收標準

1. ✅ TypeScript 編譯通過（零錯誤）
2. ✅ OCR 成功後自動上傳到 FileSearchStore
3. ✅ 上傳失敗不影響主流程（只記錄日誌）
4. ✅ 成功上傳顯示日誌：`[FileSearchStore] Uploaded: 公司名_日期 (bytes)`
5. ✅ 可透過 Gemini 3.0 查詢到上傳的資料
6. ✅ Metadata 正確設定（organization, organization_en）
7. ✅ Content 包含：公司名稱、別名、摘要、專業人員、來源

---

## 📝 修改檔案清單

1. `src/types.ts` - 加入 FILE_SEARCH_STORE_NAME
2. `wrangler.toml` - 加入環境變數（staging + production）
3. `.dev.vars` - 加入本地環境變數
4. `src/handlers/user/received-cards/unified-extract.ts` - 加入上傳函式 + 修改簽名
5. `src/index.ts` - 修改路由呼叫（傳入 ctx）
6. `README.md` - 更新文檔
7. `.specify/memory/knowledge_graph.mem` - 歸檔知識

---

## 🚀 下一步行動

**立即開始 Step 1**：環境變數與型別配置

預計完成時間：2026-02-24 18:45
