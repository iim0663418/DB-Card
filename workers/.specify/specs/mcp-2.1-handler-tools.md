# Spec 2.1: MCP JSON-RPC Handler + Tool Definitions

## Context
MCP 使用 JSON-RPC 2.0 over Streamable HTTP。
POST /mcp 接收 JSON-RPC 請求，驗證 Bearer token 後分派到對應 tool。

## Impacted Modules
- **New**: `src/handlers/mcp/handler.ts` (JSON-RPC dispatcher + token validation)
- **New**: `src/handlers/mcp/tools.ts` (7 個 tool 實作)
- **Modified**: `src/index.ts` (替換 /mcp POST 的 401 guard 為完整 handler)
- **Reuse**: `jose` (jwtVerify), `handlers/user/received-cards/vcard.ts` (generateVCard)

## Scenarios

### Scenario 1: Token 驗證
```
Given POST /mcp with Authorization: Bearer {jwt}
When handler 驗證 token
Then jwtVerify 檢查: iss == env.WORKER_URL, aud == resource URI, alg == HS256
And 從 payload 取得 email 和 scope
And 檢查 email allowlist (同 oauth-authorize.ts 的 SQL)
And 驗證 scope 包含所需權限
```

### Scenario 2: initialize
```
When JSON-RPC method = "initialize"
Then 回傳:
  {
    "jsonrpc": "2.0",
    "id": {request_id},
    "result": {
      "protocolVersion": "2025-06-18",
      "capabilities": { "tools": {} },
      "serverInfo": { "name": "db-card-mcp", "version": "0.1.0" }
    }
  }
```

### Scenario 3: tools/list
```
When JSON-RPC method = "tools/list"
Then 回傳 7 個 tool 定義，每個包含 name, description, inputSchema (JSON Schema)
Tools:
  1. list_received_cards: { page?, limit?, sort_by? }
  2. search_received_cards: { full_name?, organization?, title?, email?, phone?, tag?, keyword?, page?, limit? }
  3. get_received_card: { uuid }
  4. save_received_card: { full_name, organization?, title?, phone?, email?, website?, address?, note? }
  5. update_received_card: { uuid, ...updatable_fields }
  6. delete_received_card: { uuid }
  7. export_vcard: { uuid }
```

### Scenario 4: tools/call — list_received_cards
```
When JSON-RPC method = "tools/call", params.name = "list_received_cards"
And scope 包含 "received_cards:read"
Then 查詢 received_cards WHERE user_email = ? AND deleted_at IS NULL AND merged_to IS NULL
And 回傳分頁結果 (含 tags)
```

### Scenario 5: tools/call — search_received_cards (結構化搜尋)
```
When params.name = "search_received_cards", params.arguments = { organization: "台積電", title: "經理" }
Then 組合 SQL WHERE 條件 (每個非空欄位 LIKE %value%)
And 回傳匹配結果
```

### Scenario 6: tools/call — get_received_card
```
When params.name = "get_received_card", params.arguments = { uuid: "..." }
Then 查詢單張名片 (含 tags, sources)
And 驗證 user_email 匹配 (tenant isolation)
```

### Scenario 7: tools/call — save_received_card
```
When params.name = "save_received_card" and scope 包含 "received_cards:write"
Then INSERT INTO received_cards (手動建立，無 upload_id)
And 自動 extract tags from organization
And 回傳 { uuid }
```

### Scenario 8: tools/call — update_received_card
```
When params.name = "update_received_card", params.arguments = { uuid, full_name: "新名字" }
And scope 包含 "received_cards:write"
Then 動態 UPDATE (只更新提供的欄位)
And 驗證 user_email 匹配
```

### Scenario 9: tools/call — delete_received_card
```
When params.name = "delete_received_card", params.arguments = { uuid: "..." }
And scope 包含 "received_cards:write"
Then UPDATE received_cards SET deleted_at = ? WHERE uuid = ? AND user_email = ?
```

### Scenario 10: tools/call — export_vcard
```
When params.name = "export_vcard", params.arguments = { uuid: "..." }
Then 查詢名片資料
And 呼叫 generateVCard() (從 vcard.ts import)
And 回傳 vCard 字串 (text content, 非 file download)
```

### Scenario 11: 權限不足
```
When scope 不包含所需權限 (e.g., write tool 但只有 read scope)
Then 回傳 JSON-RPC error { code: -32600, message: "Insufficient scope" }
```

### Scenario 12: 未知 method
```
When JSON-RPC method 不是 initialize/tools/list/tools/call
Then 回傳 JSON-RPC error { code: -32601, message: "Method not found" }
```

## Validation Target
- TypeScript 編譯通過
- JSON-RPC 2.0 response 格式正確

## Technical Notes
- handler.ts 負責: token 驗證 + JSON-RPC 解析 + method dispatch
- tools.ts 負責: tool 定義 + 每個 tool 的業務邏輯 (直接 SQL)
- generateVCard 從 vcard.ts import (已是純函式)
- search 不用 Vectorize/Gemini，純 SQL LIKE
- tag 篩選: JOIN card_tags WHERE normalized_value LIKE ?
- list 預設 sort: COALESCE(updated_at, created_at) DESC
- save 時自動 extractTagsFromOrganization (重用 utils/tags.ts)
- JSON-RPC error codes: -32600 (invalid request), -32601 (method not found), -32602 (invalid params)
