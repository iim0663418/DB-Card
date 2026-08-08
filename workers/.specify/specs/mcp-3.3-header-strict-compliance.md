# Spec 3.3: MCP Header Validation + Strict Compliance

## Context
MCP 2026-07-28 要求 Streamable HTTP POST 請求攜帶 `Mcp-Method` 和 `Mcp-Name` headers。
本 spec 在確認過渡期結束（所有活躍 client 已升級）後，啟用嚴格 header 驗證。

前提：Phase 1 (spec-3.1) 已實作 header 讀取 + audit log enrichment。
本 spec 將 header 驗證從 log-only 升級為 enforce。

## Impacted Modules
- **Modified**: `src/handlers/mcp/handler.ts` (header validation logic)

## Scenarios

### Scenario 1: Header-body 一致性驗證 — 通過
```
Given HTTP POST /mcp with headers:
  Mcp-Method: tools/call
  Mcp-Name: search_received_cards
And JSON-RPC body method = "tools/call", params.name = "search_received_cards"
When handler 驗證 headers
Then 驗證通過，正常處理請求
```

### Scenario 2: Header-body method 不一致 — 拒絕
```
Given HTTP POST /mcp with headers:
  Mcp-Method: tools/list
And JSON-RPC body method = "tools/call"
When handler 驗證 headers
Then 回傳 JSON-RPC error:
  { code: -32020, message: "Header mismatch: Mcp-Method does not match body method" }
```

### Scenario 3: Header-body name 不一致 — 拒絕
```
Given HTTP POST /mcp with headers:
  Mcp-Method: tools/call
  Mcp-Name: list_received_cards
And JSON-RPC body params.name = "search_received_cards"
When handler 驗證 headers
Then 回傳 JSON-RPC error:
  { code: -32020, message: "Header mismatch: Mcp-Name does not match tool name" }
```

### Scenario 4: 缺少 headers — 依 protocol version 決定
```
Given HTTP POST /mcp 無 Mcp-Method header
And request body _meta.protocolVersion = "2026-07-28"
When handler 驗證 headers
Then 回傳 JSON-RPC error:
  { code: -32020, message: "Missing required Mcp-Method header" }
```

### Scenario 5: 缺少 headers — 舊 client 寬容
```
Given HTTP POST /mcp 無 Mcp-Method header
And request body 無 _meta（2025-06-18 client）
When handler 驗證 headers
Then 跳過 header 驗證，正常處理（向後相容）
```

### Scenario 6: Mcp-Name 只在特定 method 需要
```
Given Mcp-Method: tools/list（不涉及單一 tool name）
And 無 Mcp-Name header
When handler 驗證 headers
Then 驗證通過（tools/list, server/discover 等不需要 Mcp-Name）
```

## Validation Target
- TypeScript 編譯通過
- 舊 client（無 _meta）不受影響
- 新 client 缺 header 或 header 不一致時收到 -32020

## Technical Notes
- Mcp-Name 只在 method = "tools/call" 時驗證
- Header validation 放在 token validation 之後、method dispatch 之前
- 啟用時機：確認 Claude Desktop / Cursor / claude.ai 已全部升級後
  可用 feature flag (env var `MCP_STRICT_HEADERS=true`) 控制
- Error code -32020 是 2026-07-28 spec 定義的 HeaderMismatchError
