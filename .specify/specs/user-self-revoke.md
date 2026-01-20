# User Self-Revoke Feature - BDD Specification

## Feature: User Self-Revoke Card
**Version**: v1.0.0  
**Date**: 2026-01-19  
**Author**: Amazon Q Dev CLI Isolation Architect

### Business Context
用戶需要能夠即時撤銷自己的名片以保障資訊安全，同時系統需要防止資源濫用。

### Design Decisions
- **Q1 撤銷頻率**: Rate Limiting (3/hour + 10/day)
- **Q2 恢復機制**: 7 天內自助恢復
- **Q3 撤銷範圍**: 立即撤銷所有 sessions
- **Q4 撤銷原因**: 可選記錄
- **Q5 通知機制**: 系統內通知

---

## API Endpoint 1: POST /api/user/cards/:uuid/revoke

### Scenario 1.1: 成功撤銷名片（首次操作）
**Given**:
- 用戶已通過 OAuth 認證（valid JWT token）
- 名片 UUID 存在且 status = 'bound'
- 該名片屬於當前用戶
- 用戶在過去 1 小時內撤銷次數 < 3
- 用戶在過去 24 小時內撤銷次數 < 10
- 該名片有 2 個 active sessions

**When**:
```http
POST /api/user/cards/550e8400-e29b-41d4-a716-446655440000/revoke
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "reason": "suspected_leak"
}
```

**Then**:
- HTTP Status: 200 OK
- Response Body:
```json
{
  "success": true,
  "message": "Card revoked successfully",
  "revoked_at": "2026-01-19T15:42:00.000Z",
  "sessions_revoked": 2,
  "restore_deadline": "2026-01-26T15:42:00.000Z"
}
```
- Database Changes:
  - `uuid_bindings.status` = 'revoked'
  - `uuid_bindings.revoked_at` = current timestamp
  - `read_sessions.revoked_at` = current timestamp (2 rows)
  - `audit_logs` 新增 1 筆 (event_type: 'user_card_revoke', metadata: reason)
  - `revocation_rate_limits` 更新計數
- Side Effects:
  - KV 快取清除: `card:data:{uuid}`
  - KV 快取清除: `card:response:{session_token}` (2 個)

---

### Scenario 1.2: 撤銷失敗 - 超過小時限制
**Given**:
- 用戶已通過認證
- 名片 UUID 存在且 status = 'bound'
- 用戶在過去 1 小時內已撤銷 3 次

**When**:
```http
POST /api/user/cards/550e8400-e29b-41d4-a716-446655440000/revoke
Authorization: Bearer {jwt_token}
```

**Then**:
- HTTP Status: 429 Too Many Requests
- Response Body:
```json
{
  "error": "REVOCATION_RATE_LIMITED",
  "message": "Revocation limit exceeded: 3 per hour",
  "retry_after": 1847,
  "limits": {
    "hourly": { "limit": 3, "remaining": 0, "reset_at": "2026-01-19T16:30:00.000Z" },
    "daily": { "limit": 10, "remaining": 5, "reset_at": "2026-01-20T00:00:00.000Z" }
  }
}
```
- Database Changes: None
- Audit Log: 記錄 rate_limit_exceeded 事件

---

### Scenario 1.3: 撤銷失敗 - 超過日限制
**Given**:
- 用戶在過去 24 小時內已撤銷 10 次
- 小時限制未超過

**When**:
```http
POST /api/user/cards/550e8400-e29b-41d4-a716-446655440000/revoke
```

**Then**:
- HTTP Status: 429 Too Many Requests
- Response Body:
```json
{
  "error": "REVOCATION_RATE_LIMITED",
  "message": "Revocation limit exceeded: 10 per day",
  "retry_after": 43200,
  "limits": {
    "hourly": { "limit": 3, "remaining": 2, "reset_at": "2026-01-19T16:30:00.000Z" },
    "daily": { "limit": 10, "remaining": 0, "reset_at": "2026-01-20T00:00:00.000Z" }
  }
}
```

---

### Scenario 1.4: 撤銷失敗 - 名片已撤銷
**Given**:
- 名片 status = 'revoked'

**When**:
```http
POST /api/user/cards/550e8400-e29b-41d4-a716-446655440000/revoke
```

**Then**:
- HTTP Status: 400 Bad Request
- Response Body:
```json
{
  "error": "CARD_ALREADY_REVOKED",
  "message": "Card is already revoked",
  "revoked_at": "2026-01-19T10:00:00.000Z"
}
```

---

### Scenario 1.5: 撤銷失敗 - 無權限
**Given**:
- 名片存在但屬於其他用戶

**When**:
```http
POST /api/user/cards/550e8400-e29b-41d4-a716-446655440000/revoke
```

**Then**:
- HTTP Status: 403 Forbidden
- Response Body:
```json
{
  "error": "FORBIDDEN",
  "message": "You do not have permission to revoke this card"
}
```

---

## API Endpoint 2: POST /api/user/cards/:uuid/restore

### Scenario 2.1: 成功恢復名片（7 天內）
**Given**:
- 用戶已通過認證
- 名片 status = 'revoked'
- 名片屬於當前用戶
- revoked_at = '2026-01-18T10:00:00.000Z' (25 小時前)

**When**:
```http
POST /api/user/cards/550e8400-e29b-41d4-a716-446655440000/restore
Authorization: Bearer {jwt_token}
```

**Then**:
- HTTP Status: 200 OK
- Response Body:
```json
{
  "success": true,
  "message": "Card restored successfully",
  "restored_at": "2026-01-19T15:42:00.000Z"
}
```
- Database Changes:
  - `uuid_bindings.status` = 'bound'
  - `uuid_bindings.revoked_at` = NULL
  - `audit_logs` 新增 1 筆 (event_type: 'user_card_restore')

---

### Scenario 2.2: 恢復失敗 - 超過 7 天窗口
**Given**:
- 名片 status = 'revoked'
- revoked_at = '2026-01-10T10:00:00.000Z' (9 天前)

**When**:
```http
POST /api/user/cards/550e8400-e29b-41d4-a716-446655440000/restore
```

**Then**:
- HTTP Status: 403 Forbidden
- Response Body:
```json
{
  "error": "RESTORE_WINDOW_EXPIRED",
  "message": "Self-service restore window expired (7 days). Please contact administrator.",
  "revoked_at": "2026-01-10T10:00:00.000Z",
  "restore_deadline": "2026-01-17T10:00:00.000Z"
}
```

---

### Scenario 2.3: 恢復失敗 - 名片未撤銷
**Given**:
- 名片 status = 'bound'

**When**:
```http
POST /api/user/cards/550e8400-e29b-41d4-a716-446655440000/restore
```

**Then**:
- HTTP Status: 400 Bad Request
- Response Body:
```json
{
  "error": "CARD_NOT_REVOKED",
  "message": "Card is not in revoked state"
}
```

---

## API Endpoint 3: GET /api/user/revocation-history

### Scenario 3.1: 查詢撤銷/恢復歷史
**Given**:
- 用戶已通過認證
- 用戶在過去 30 天內有 5 次撤銷/恢復操作

**When**:
```http
GET /api/user/revocation-history?limit=10
Authorization: Bearer {jwt_token}
```

**Then**:
- HTTP Status: 200 OK
- Response Body:
```json
{
  "history": [
    {
      "card_uuid": "550e8400-e29b-41d4-a716-446655440000",
      "card_name": "張三 - 數位發展部",
      "action": "revoke",
      "reason": "suspected_leak",
      "timestamp": "2026-01-19T15:42:00.000Z",
      "sessions_affected": 2
    },
    {
      "card_uuid": "550e8400-e29b-41d4-a716-446655440000",
      "card_name": "張三 - 數位發展部",
      "action": "restore",
      "reason": null,
      "timestamp": "2026-01-18T10:00:00.000Z",
      "sessions_affected": 0
    }
  ],
  "total": 5,
  "limit": 10
}
```

---

## Database Schema Changes

### Migration 0009: Revocation Rate Limits Table
```sql
-- 撤銷速率限制表
CREATE TABLE IF NOT EXISTS revocation_rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  window_type TEXT NOT NULL CHECK(window_type IN ('hourly', 'daily')),
  window_start INTEGER NOT NULL, -- Unix timestamp
  revocation_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_rate_limits_user_window 
ON revocation_rate_limits(user_id, window_type, window_start);

-- 清理過期記錄（保留 48 小時）
CREATE INDEX idx_rate_limits_cleanup 
ON revocation_rate_limits(window_start);
```

### Migration 0010: Add revoked_at to uuid_bindings
```sql
-- 添加撤銷時間戳
ALTER TABLE uuid_bindings ADD COLUMN revoked_at INTEGER;

CREATE INDEX idx_uuid_bindings_revoked_at 
ON uuid_bindings(revoked_at) 
WHERE revoked_at IS NOT NULL;
```

---

## Frontend Changes: user-portal.html

### UI Components

#### 1. 撤銷按鈕（卡片列表）
```html
<!-- 顯示條件: status === 'bound' -->
<button class="revoke-btn" data-uuid="{uuid}">
  <i data-lucide="shield-alert"></i>
  <span data-i18n="revoke_card">撤銷名片</span>
</button>
```

#### 2. 撤銷確認對話框
```html
<div id="revokeModal" class="modal">
  <h3 data-i18n="revoke_confirmation">確認撤銷名片</h3>
  <p data-i18n="revoke_warning">
    撤銷後，所有分享的連結將立即失效。您可在 7 天內自行恢復。
  </p>
  
  <label data-i18n="revoke_reason_optional">撤銷原因（可選）</label>
  <select id="revokeReason">
    <option value="">不提供原因</option>
    <option value="lost" data-i18n="reason_lost">卡片遺失</option>
    <option value="suspected_leak" data-i18n="reason_leak">疑似資訊外洩</option>
    <option value="info_update" data-i18n="reason_update">資訊需更新</option>
    <option value="misdelivery" data-i18n="reason_misdelivery">誤發</option>
    <option value="other" data-i18n="reason_other">其他</option>
  </select>
  
  <div class="modal-actions">
    <button id="confirmRevoke" class="btn-danger">確認撤銷</button>
    <button id="cancelRevoke" class="btn-secondary">取消</button>
  </div>
</div>
```

#### 3. 恢復按鈕（已撤銷卡片）
```html
<!-- 顯示條件: status === 'revoked' && within 7 days -->
<button class="restore-btn" data-uuid="{uuid}">
  <i data-lucide="rotate-ccw"></i>
  <span data-i18n="restore_card">恢復名片</span>
</button>

<!-- 超過 7 天顯示 -->
<span class="restore-expired" data-i18n="restore_expired">
  恢復期限已過，請聯繫管理員
</span>
```

#### 4. 操作歷史區塊
```html
<div id="revocationHistory" class="history-section">
  <h3 data-i18n="revocation_history">撤銷/恢復歷史</h3>
  <table>
    <thead>
      <tr>
        <th data-i18n="card_name">名片名稱</th>
        <th data-i18n="action">操作</th>
        <th data-i18n="reason">原因</th>
        <th data-i18n="timestamp">時間</th>
      </tr>
    </thead>
    <tbody id="historyTableBody">
      <!-- 動態填充 -->
    </tbody>
  </table>
</div>
```

#### 5. Rate Limit 錯誤提示
```html
<div id="rateLimitError" class="error-banner" style="display:none;">
  <i data-lucide="alert-triangle"></i>
  <span id="rateLimitMessage"></span>
  <span id="retryAfter"></span>
</div>
```

---

## JavaScript Functions

### 1. 撤銷名片
```javascript
async function revokeCard(uuid, reason) {
  const response = await fetch(`/api/user/cards/${uuid}/revoke`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason || undefined })
  });
  
  if (response.status === 429) {
    const data = await response.json();
    showRateLimitError(data);
    return;
  }
  
  if (!response.ok) throw new Error(await response.text());
  
  const data = await response.json();
  showSuccess(`名片已撤銷，可在 ${formatDate(data.restore_deadline)} 前恢復`);
  await loadCards(); // 重新載入卡片列表
}
```

### 2. 恢復名片
```javascript
async function restoreCard(uuid) {
  const response = await fetch(`/api/user/cards/${uuid}/restore`, {
    method: 'POST',
    credentials: 'include'
  });
  
  if (response.status === 403) {
    const data = await response.json();
    if (data.error === 'RESTORE_WINDOW_EXPIRED') {
      showError('恢復期限已過（7 天），請聯繫管理員');
      return;
    }
  }
  
  if (!response.ok) throw new Error(await response.text());
  
  showSuccess('名片已恢復');
  await loadCards();
}
```

### 3. 載入操作歷史
```javascript
async function loadRevocationHistory() {
  const response = await fetch('/api/user/revocation-history?limit=20', {
    credentials: 'include'
  });
  
  if (!response.ok) return;
  
  const data = await response.json();
  renderHistoryTable(data.history);
}
```

### 4. Rate Limit 錯誤處理
```javascript
function showRateLimitError(data) {
  const banner = document.getElementById('rateLimitError');
  const message = document.getElementById('rateLimitMessage');
  const retryAfter = document.getElementById('retryAfter');
  
  message.textContent = data.message;
  retryAfter.textContent = `請在 ${formatDuration(data.retry_after)} 後重試`;
  
  banner.style.display = 'flex';
  setTimeout(() => banner.style.display = 'none', 10000);
}
```

---

## I18N Keys

### 繁體中文 (zh-TW)
```json
{
  "revoke_card": "撤銷名片",
  "restore_card": "恢復名片",
  "revoke_confirmation": "確認撤銷名片",
  "revoke_warning": "撤銷後，所有分享的連結將立即失效。您可在 7 天內自行恢復。",
  "revoke_reason_optional": "撤銷原因（可選）",
  "reason_lost": "卡片遺失",
  "reason_leak": "疑似資訊外洩",
  "reason_update": "資訊需更新",
  "reason_misdelivery": "誤發",
  "reason_other": "其他",
  "restore_expired": "恢復期限已過，請聯繫管理員",
  "revocation_history": "撤銷/恢復歷史",
  "action": "操作",
  "reason": "原因",
  "timestamp": "時間"
}
```

### English (en-US)
```json
{
  "revoke_card": "Revoke Card",
  "restore_card": "Restore Card",
  "revoke_confirmation": "Confirm Card Revocation",
  "revoke_warning": "All shared links will be immediately invalidated. You can restore within 7 days.",
  "revoke_reason_optional": "Revocation Reason (Optional)",
  "reason_lost": "Card Lost",
  "reason_leak": "Suspected Information Leak",
  "reason_update": "Information Update Needed",
  "reason_misdelivery": "Misdelivery",
  "reason_other": "Other",
  "restore_expired": "Restore window expired. Please contact administrator.",
  "revocation_history": "Revocation/Restore History",
  "action": "Action",
  "reason": "Reason",
  "timestamp": "Timestamp"
}
```

---

## Acceptance Criteria

### ✅ Functional Requirements
- [ ] 用戶可撤銷自己的名片
- [ ] 撤銷時立即使所有 active sessions 失效
- [ ] Rate Limiting: 3/hour, 10/day
- [ ] 7 天內可自助恢復
- [ ] 超過 7 天需 Admin 處理
- [ ] 可選填撤銷原因
- [ ] 顯示操作歷史（30 天內）

### ✅ Non-Functional Requirements
- [ ] API 響應時間 < 500ms
- [ ] Rate Limit 錯誤訊息清晰
- [ ] UI 文案明確警告撤銷影響
- [ ] 審計日誌完整記錄
- [ ] 雙語支援（中英文）

### ✅ Security Requirements
- [ ] JWT 認證保護所有端點
- [ ] 只能操作自己的名片
- [ ] Rate Limiting 防止濫用
- [ ] IP 匿名化記錄
- [ ] 撤銷原因不包含 PII

---

## Implementation Checklist

### Backend
- [ ] Migration 0009: revocation_rate_limits 表
- [ ] Migration 0010: uuid_bindings.revoked_at 欄位
- [ ] utils/rate-limit.ts: Rate Limiting 邏輯
- [ ] handlers/user/cards.ts: revoke/restore 端點
- [ ] handlers/user/history.ts: revocation-history 端點
- [ ] types.ts: 新增類型定義
- [ ] 更新 audit logging

### Frontend
- [ ] user-portal.html: UI 元件
- [ ] JavaScript: revoke/restore 函數
- [ ] I18N: 新增翻譯 keys
- [ ] CSS: 按鈕樣式與錯誤提示
- [ ] 操作歷史表格

### Testing
- [ ] 單元測試: Rate Limiting 邏輯
- [ ] 整合測試: 8 個 BDD 場景
- [ ] E2E 測試: 完整用戶流程
- [ ] 性能測試: API 響應時間

---

**End of BDD Specification**
