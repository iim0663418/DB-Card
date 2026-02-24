# Scenario: FileSearchStore Integration - Final Implementation

## Given
- FileSearchStore 已建立：dbcard-knowledge-base-fpyodw69c4ua
- Gemini OCR 成功提取公司資訊
- 包含 organization, organization_alias, company_summary, personal_summary, sources

## When
- unified_extract 返回結果給用戶

## Then
1. 立即返回 OCR 結果（不等待上傳）
2. 背景任務上傳到 FileSearchStore（ctx.waitUntil）
3. 上傳失敗只記錄日誌，不影響主流程
4. 成功上傳記錄日誌：`[FileSearchStore] Uploaded: 公司名_日期 (bytes)`

## Technical Implementation

### 1. Environment Variables
- types.ts: FILE_SEARCH_STORE_NAME?: string
- wrangler.toml: [vars] + [env.production.vars]
- .dev.vars: FILE_SEARCH_STORE_NAME

### 2. Handler Signature
- unified-extract.ts: (request, env, ctx)
- index.ts: handleUnifiedExtract(c.req.raw, c.env, c.executionCtx)

### 3. Upload Function
- uploadToFileSearchStore(data, apiKey, storeName)
- Content: 公司名稱 + 別名 + 摘要 + 專業人員 + 來源
- Metadata: organization + organization_en

### 4. Integration
- ctx.waitUntil(uploadToFileSearchStore(...).catch(...))
- 條件：env.FILE_SEARCH_STORE_NAME && result.organization

## Acceptance Criteria
1. TypeScript 編譯通過
2. 成功上傳顯示日誌
3. 可透過 Gemini 3.0 查詢
4. Metadata 正確設定
