# Scenario: FileSearchStore Integration for Company Knowledge Caching

## Business Value
- 減少重複 Web Search（節省 API 配額）
- 加快 OCR 速度（已知公司直接查詢）
- 累積知識庫（越用越聰明）

## Given
- 用戶上傳名片圖片
- Gemini OCR + Web Search 成功提取公司資訊
- 包含 company_summary, sources, organization, organization_en

## When
- unified_extract 返回結果給用戶

## Then
1. **主流程**：立即返回 OCR 結果給用戶（不等待上傳）
2. **背景任務**：非阻塞上傳到 FileSearchStore
   - 組合文件內容（company_summary + sources）
   - 設定 metadata（organization, organization_en）
   - 使用 ctx.waitUntil() 非阻塞執行
3. **錯誤處理**：上傳失敗記錄日誌，不影響主流程

## Technical Requirements

### 1. 環境變數
```toml
# wrangler.toml
[vars]
FILE_SEARCH_STORE_NAME = "fileSearchStores/dbcard-knowledge-base-fpyodw69c4ua"
```

### 2. 上傳函式
```typescript
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
```

### 3. 整合到 unified_extract.ts
```typescript
// In handleUnifiedExtract()
const result = await performUnifiedExtract(...);

// 非阻塞上傳到 FileSearchStore
if (env.FILE_SEARCH_STORE_NAME && result.organization) {
  ctx.waitUntil(
    uploadToFileSearchStore(result, env.GEMINI_API_KEY, env.FILE_SEARCH_STORE_NAME)
      .catch(err => console.error('[FileSearchStore] Upload failed:', err))
  );
}

return Response.json(result);
```

## Error Handling

| 錯誤類型 | 處理方式 |
|---------|---------|
| 上傳失敗 | 記錄日誌，不影響主流程 |
| Store 不存在 | 記錄日誌，不影響主流程 |
| API Key 無效 | 記錄日誌，不影響主流程 |
| 網路超時 | 記錄日誌，不影響主流程 |

## Non-Functional Requirements
- 上傳不阻塞主流程（< 50ms overhead）
- 失敗不影響用戶體驗
- 日誌記錄便於除錯

## Future Enhancements (Out of Scope)
- 查詢 Store 避免重複上傳
- 定期清理舊文件
- 使用 FileSearchStore 加速 OCR（查詢優先）

## Acceptance Criteria
1. ✅ OCR 成功後自動上傳到 FileSearchStore
2. ✅ 上傳失敗不影響主流程
3. ✅ 可透過 Gemini 3.0 查詢到上傳的資料
4. ✅ Metadata 正確設定（organization, organization_en）
5. ✅ 日誌記錄上傳狀態
