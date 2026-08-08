# Spec 3.1: MCP Protocol 2026-07-28 Forward Compatibility

## Context
MCP 2026-07-28 spec 於 2026-07-28 定稿，為協議史上最大改版：
- 移除 `initialize`/`initialized` handshake，改為 stateless per-request `_meta` envelope
- 新增 `server/discover` RPC（MUST implement）
- 所有 result 加 `resultType` 欄位
- `tools/list` 加 cache hints (`ttlMs`, `cacheScope`)
- 新增 `Mcp-Method` / `Mcp-Name` HTTP headers

DB-Card 現有實作宣告 `protocolVersion: "2025-06-18"`，為純手刻 stateless JSON-RPC。
因架構本已 stateless（無 session、無 SSE），升級主要是 handler dispatch 邏輯調整。

Client 過渡期：Claude Desktop / Cursor / claude.ai 可能同時存在新舊 protocol client，
handler 需雙版本並存直到確認所有活躍 client 已升級。

## Impacted Modules
- **Modified**: `src/handlers/mcp/handler.ts` (dispatch 邏輯、response format)
- **Modified**: `src/index.ts` (無路由變更，但需確認 POST /mcp 不依賴 method)

## Scenarios

### Scenario 1: server/discover — 新 client 初次探測
```
Given MCP client 支援 2026-07-28 protocol
When POST /mcp with JSON-RPC method = "server/discover"
And Authorization: Bearer {valid_jwt}
Then 回傳 HTTP 200 with JSON-RPC result:
  {
    "jsonrpc": "2.0",
    "id": {request_id},
    "result": {
      "resultType": "complete",
      "protocolVersions": ["2026-07-28", "2025-06-18"],
      "capabilities": { "tools": {} },
      "serverInfo": { "name": "db-card-mcp", "version": "5.2.0" }
    }
  }
```

### Scenario 2: initialize — 向後相容舊 client
```
Given MCP client 仍使用 2025-06-18 protocol（如未更新的 Cursor）
When JSON-RPC method = "initialize"
Then 回傳與現有格式相同:
  {
    "jsonrpc": "2.0",
    "id": {request_id},
    "result": {
      "protocolVersion": "2026-07-28",
      "capabilities": { "tools": {} },
      "serverInfo": { "name": "db-card-mcp", "version": "5.2.0" }
    }
  }
Note: 不加 resultType（舊 client 不認得，保持舊格式不破壞相容）
```

### Scenario 3: _meta envelope 解析
```
Given 新 client 發送 tools/call with _meta
When JSON-RPC body 包含:
  {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "_meta": {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientInfo": { "name": "claude-desktop", "version": "4.0" }
      },
      "name": "list_received_cards",
      "arguments": {}
    }
  }
Then handler 解析 _meta.protocolVersion 決定 response format
And 如果 protocolVersion 不在 ["2026-07-28", "2025-06-18"] 中:
  回傳 JSON-RPC error { code: -32022, message: "Unsupported protocol version" }
And 如果無 _meta（舊 client），視為 2025-06-18 格式
```

### Scenario 4: tools/list — 新格式含 cache hints
```
Given client protocolVersion = "2026-07-28"（來自 _meta 或 discover 後）
When JSON-RPC method = "tools/list"
Then 回傳:
  {
    "jsonrpc": "2.0",
    "id": {request_id},
    "result": {
      "resultType": "complete",
      "tools": [ ...TOOL_DEFINITIONS ],
      "ttlMs": 3600000,
      "cacheScope": "public",
      "_meta": {
        "io.modelcontextprotocol/serverInfo": { "name": "db-card-mcp", "version": "5.2.0" }
      }
    }
  }
```

### Scenario 5: tools/list — 舊格式（無 _meta request）
```
Given client 未帶 _meta（2025-06-18 client）
When JSON-RPC method = "tools/list"
Then 回傳舊格式（不含 resultType、ttlMs、cacheScope、_meta）:
  {
    "jsonrpc": "2.0",
    "id": {request_id},
    "result": { "tools": [ ...TOOL_DEFINITIONS ] }
  }
```

### Scenario 6: tools/call result — 新格式
```
Given client protocolVersion = "2026-07-28"
When tools/call 執行成功
Then result 包含 resultType 和 _meta:
  {
    "jsonrpc": "2.0",
    "id": {request_id},
    "result": {
      "resultType": "complete",
      "content": [ ... ],
      "_meta": {
        "io.modelcontextprotocol/serverInfo": { "name": "db-card-mcp", "version": "5.2.0" }
      }
    }
  }
```

### Scenario 7: tools/call result — 舊格式
```
Given client 未帶 _meta
When tools/call 執行成功
Then result 保持現有格式（不含 resultType / _meta）
```

### Scenario 8: Mcp-Method / Mcp-Name header 讀取
```
Given HTTP POST /mcp with headers:
  Mcp-Method: tools/call
  Mcp-Name: list_received_cards
When handler 處理請求
Then 將 header 值寫入 audit log details（enrichment only）
And 不做 header-body 一致性驗證（Phase 3 才 enforce）
And 缺少 header 時不拒絕（向後相容過渡期 client）
```

### Scenario 9: notifications/initialized — 忽略
```
Given 舊 client 發送 notifications/initialized（id 為 undefined/null）
When handler 收到 JSON-RPC notification（無 id）
Then 回傳 HTTP 204 No Content（JSON-RPC notification 不需 response）
Or 回傳 HTTP 200 with empty JSON-RPC response（寬容處理）
```

## Validation Target
- TypeScript 編譯通過
- 既有 56 tests 全通過（向後相容不破壞）
- 新增 tests:
  - server/discover 回傳正確格式
  - 帶 _meta 的 tools/list 回傳 resultType + ttlMs + cacheScope
  - 不帶 _meta 的 tools/list 回傳舊格式
  - 不支援的 protocolVersion 回傳 -32022

## Technical Notes
- protocolVersion 判斷邏輯：`params._meta?.['io.modelcontextprotocol/protocolVersion']`
  - 有值且為 "2026-07-28" → 新格式 response
  - 有值但不支援 → error -32022
  - 無 _meta → 舊格式（2025-06-18 compat）
- serverInfo.version 從 config.ts VERSION 常數取得（與 version:inject 同步）
- `server/discover` 不需 token 驗證的爭議：spec 說 client MAY call before auth，
  但 DB-Card 所有 POST /mcp 都需 auth（安全考量）。
  折衷：server/discover 仍需 token，但不檢查 scope。
- `initialize` 保留至 Phase 4 移除，response 格式升級到 2026-07-28 但不加 resultType
- JSON-RPC notification（無 id）的處理：目前 handler 假設所有 request 有 id，需加 guard
