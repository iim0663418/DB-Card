# Spec P3: MCP Rate Limiting + Audit Logging

## Context
Self-review 發現 MCP 端點缺少 rate limiting 和 audit logging。
最關鍵的是 /mcp/token（防暴力破解）和 /mcp tool calls（審計追蹤）。

## Impacted Modules
- **Modified**: `src/handlers/mcp/oauth-token.ts` (rate limit on token endpoint)
- **Modified**: `src/handlers/mcp/handler.ts` (audit log on tool calls)
- **Reuse**: `utils/audit.ts` (logSecurityEvent, anonymizeIP), KV for rate limit counters

## Scenarios

### Scenario 1: Token endpoint rate limiting
```
Given 同一 IP 對 /mcp/token 發送請求
When 60 秒內超過 10 次
Then 回傳 HTTP 429 { "error": "rate_limit_exceeded" }
And header Retry-After: {seconds}
And 記錄 security_event
```

### Scenario 2: MCP tool call audit logging
```
Given 認證通過的 MCP tool call
When tools/call 執行完成
Then 非阻塞寫入 audit_logs:
  event_type = 'mcp_tool_call'
  details = { tool, email, success }
  ip_address = anonymized
```

## Technical Notes
- Token rate limit 用 KV counter (簡單，不需 DO)
- KV key: mcp_token_rl:{ip_hash} TTL 60s
- Audit log 用 ctx.waitUntil 非阻塞寫入（但 MCP handler 沒有 ctx，改用 fire-and-forget）
- 不阻塞主流程 — audit 失敗靜默忽略
