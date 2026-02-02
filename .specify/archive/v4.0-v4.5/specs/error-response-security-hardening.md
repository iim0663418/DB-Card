# BDD Spec: 錯誤處理安全強化 (Error Response Security Hardening)

**Feature**: 防止錯誤訊息資訊洩露
**Priority**: High (Security)
**Status**: Planned

## 背景 (Context)

當前系統的錯誤回應可能洩露以下資訊：
- API 端點結構（`"code":"not_found"`）
- 錯誤分類邏輯（區分 404/401/403）
- 系統內部狀態（詳細錯誤訊息）

這些資訊可被攻擊者用於：
1. 端點枚舉攻擊
2. 系統架構探測
3. 時序攻擊

## Scenario 1: 統一公開錯誤回應

**Given**: 使用者訪問不存在的端點或未授權資源
**When**: 系統返回錯誤回應
**Then**: 
- 公開 API 返回通用錯誤格式
- 不洩露錯誤代碼和詳細訊息
- 內部日誌記錄完整錯誤資訊

### 實作需求
```typescript
// 公開錯誤回應（統一格式）
{ "success": false }

// 內部日誌（完整資訊）
{
  "timestamp": "2026-01-18T10:30:00.000Z",
  "error_code": "not_found",
  "message": "Endpoint /api/invalid not found",
  "ip": "192.168.1.xxx",
  "user_agent": "..."
}
```

## Scenario 2: 管理 API 錯誤回應（已認證）

**Given**: 已認證的管理員訪問資源
**When**: 發生錯誤（如資源不存在）
**Then**: 
- 可返回較詳細的錯誤訊息（已驗證身份）
- 仍避免洩露系統內部結構
- 提供足夠資訊協助除錯

### 實作需求
```typescript
// 管理 API 錯誤回應（適度詳細）
{
  "success": false,
  "error": "Resource not found"
}
```

## Scenario 3: 速率限制防止端點枚舉

**Given**: 攻擊者嘗試枚舉 API 端點
**When**: 短時間內產生大量 404 錯誤
**Then**: 
- 觸發速率限制機制
- 暫時封鎖該 IP
- 記錄可疑行為到審計日誌

### 實作需求
- 每 IP 每分鐘最多 20 次 404 錯誤
- 超過限制返回 429 Too Many Requests
- 封鎖時間：5 分鐘

## Scenario 4: 回應時間標準化

**Given**: 系統處理不同類型的錯誤
**When**: 返回錯誤回應
**Then**: 
- 所有錯誤回應時間相近
- 防止時序攻擊
- 無法透過回應時間推測端點存在性

### 實作需求
```typescript
// 標準化延遲（防止時序分析）
const STANDARD_ERROR_DELAY = 100; // ms
await new Promise(resolve => setTimeout(resolve, STANDARD_ERROR_DELAY));
```

## Scenario 5: 錯誤監控與告警

**Given**: 系統運行中
**When**: 偵測到異常錯誤模式
**Then**: 
- 記錄到審計日誌
- 觸發安全告警（可選）
- 提供分析報告

### 監控指標
- 每 IP 的 404 錯誤率
- 端點掃描模式（連續測試多個路徑）
- 異常時間段的錯誤峰值

## 技術實作

### 1. 更新 response.ts

```typescript
// 新增：公開錯誤回應（最小資訊）
export function publicErrorResponse(status: number = 400, request?: Request): Response {
  const corsHeaders = request ? getCorsHeaders(request) : {};
  
  return new Response(
    JSON.stringify({ success: false }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }
  );
}

// 新增：管理錯誤回應（適度詳細）
export function adminErrorResponse(message: string, status: number = 400, request?: Request): Response {
  const corsHeaders = request ? getCorsHeaders(request) : {};
  
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }
  );
}

// 保留：內部錯誤回應（完整資訊，僅用於日誌）
export function errorResponse(code: string, message: string, status: number = 400, request?: Request): Response {
  // 現有實作保持不變，但僅用於內部日誌
}
```

### 2. 更新 index.ts（主路由）

```typescript
// 404 錯誤處理
if (!response) {
  // 記錄到內部日誌
  await logError(request, 'not_found', 'Endpoint not found', 404);
  
  // 返回通用錯誤（不洩露資訊）
  response = publicErrorResponse(404, request);
}
```

### 3. 新增速率限制中介層

```typescript
// middleware/rate-limit.ts
export async function rateLimitMiddleware(
  request: Request,
  env: Env,
  errorType: '404' | '401' | '403'
): Promise<Response | null> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `rate_limit:${errorType}:${ip}`;
  
  // 使用 KV 或 Durable Objects 實作計數器
  const count = await env.KV?.get(key);
  
  if (count && parseInt(count) > 20) {
    return publicErrorResponse(429, request);
  }
  
  return null; // 未超過限制
}
```

### 4. 更新審計日誌

```typescript
// utils/audit.ts
export async function logSecurityEvent(
  db: D1Database,
  event: {
    type: 'endpoint_enumeration' | 'rate_limit_exceeded' | 'suspicious_pattern',
    ip: string,
    details: string
  }
): Promise<void> {
  await db.prepare(`
    INSERT INTO security_events (type, ip, details, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).bind(event.type, anonymizeIP(event.ip), event.details).run();
}
```

## 測試計劃

### 單元測試
- [ ] publicErrorResponse 不洩露錯誤代碼
- [ ] adminErrorResponse 提供適度資訊
- [ ] 速率限制正確計數
- [ ] 回應時間標準化

### 整合測試
- [ ] 404 錯誤返回通用格式
- [ ] 管理 API 錯誤返回適度詳細
- [ ] 速率限制觸發後封鎖 IP
- [ ] 審計日誌正確記錄

### 安全測試
- [ ] 端點枚舉攻擊被速率限制阻擋
- [ ] 時序攻擊無法推測端點存在性
- [ ] 錯誤訊息不洩露系統資訊

## 部署計劃

### Phase 1: 錯誤回應標準化
- 更新 response.ts
- 更新所有公開 API 端點
- 部署到 staging 測試

### Phase 2: 速率限制
- 實作速率限制中介層
- 整合到主路由
- 監控效果

### Phase 3: 監控與告警
- 實作安全事件日誌
- 設定告警閾值
- 建立分析儀表板

## 相關文檔
- ADR-001: 隱私優先設計原則
- ADR-002: 信封加密架構
- SECURITY-ASSESSMENT-ADMIN-TOKEN.md

## 參考資料
- OWASP API Security Top 10
- CWE-209: Information Exposure Through an Error Message
- NIST SP 800-53: Error Handling
