# Spec 3.4: MCP Legacy Deprecation & Removal (Phase 4)

## Context
MCP 2026-07-28 spec deprecation policy 定義 12 個月 deprecation window。
DB-Card 需在此窗口內完成：
1. Dynamic Client Registration (DCR) → Client ID Metadata Documents (CIMD) 遷移
2. `initialize` method handler 移除
3. 舊 protocol version (2025-06-18) 支援終止

Timeline:
- DCR deprecated: 2026-07-28（removal deadline: 2027 夏 ≈ 2027-07）
- initialize removal: 視 client 升級進度（預估 2027 Q1）
- 2025-06-18 support removal: 與 initialize 同步

## Impacted Modules
- **Modified**: `src/handlers/mcp/handler.ts` (移除 initialize + 舊格式 response path)
- **Removed**: `src/handlers/mcp/oauth-register.ts` (DCR endpoint)
- **Modified**: `src/index.ts` (移除 /mcp/register 路由)
- **Modified**: `src/handlers/mcp/oauth-metadata.ts` (移除 registration_endpoint)

## Scenarios

### Scenario 1: DCR 退場前 — deprecation notice
```
Given DCR endpoint 仍運作中
When POST /mcp/register 成功註冊
Then response header 新增:
  Deprecation: true
  Sunset: 2027-07-28T00:00:00Z
  Link: <https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration#client-id-metadata-documents>; rel="successor-version"
And response body 新增欄位:
  "deprecation_notice": "Dynamic Client Registration is deprecated. Use Client ID Metadata Documents instead. Removal date: 2027-07-28"
```

### Scenario 2: DCR 退場後 — 410 Gone
```
Given DCR removal date 已過 (env.DCR_REMOVED = true 或 Date > deadline)
When POST /mcp/register
Then 回傳 HTTP 410 Gone:
  {
    "error": "endpoint_removed",
    "message": "Dynamic Client Registration has been removed. Use Client ID Metadata Documents.",
    "migration_guide": "https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration#client-id-metadata-documents"
  }
```

### Scenario 3: initialize 移除後
```
Given initialize handler 已移除
When JSON-RPC method = "initialize"
Then 回傳 JSON-RPC error:
  { code: -32601, message: "Method not found. Use server/discover instead." }
```

### Scenario 4: 舊 protocol version 終止
```
Given 2025-06-18 support 已終止
When 任何 request 無 _meta 且無 Mcp-Method header（判斷為舊 client）
Then 回傳 JSON-RPC error:
  { code: -32022, message: "Protocol version 2025-06-18 is no longer supported. Please upgrade your MCP client." }
```

### Scenario 5: AS Metadata 移除 registration_endpoint
```
Given DCR 已退場
When GET /.well-known/oauth-authorization-server
Then response body 不再包含 "registration_endpoint" 欄位
```

## Prerequisites for Execution
- [ ] Audit: 確認 KV 中活躍 client registrations 數量 & 最近使用時間
- [ ] 通知已知 client 開發者（Cursor team、已註冊的 custom agent 開發者）
- [ ] 確認 CIMD 路徑正常運作 ≥ 30 天無問題
- [ ] 確認 audit_logs 中 initialize method 呼叫次數歸零 ≥ 14 天
- [ ] 確認 audit_logs 中所有 tool call 都帶 _meta（新 client indicator）

## Technical Notes
- DCR removal 用 env var `DCR_REMOVED` 控制（先 staging 觀察，再 production）
- initialize removal 用 env var `LEGACY_INITIALIZE_REMOVED` 控制
- 退場前需備份 KV 中所有 `mcp_client:*` 記錄
- KV client records 可保留（CIMD cache 用不同 key prefix `mcp_cimd:*`）
- Authorization server metadata 的 `registration_endpoint` 移除會影響 client auto-discovery，
  確保 CIMD 路徑已被所有 client 支援後才移除
