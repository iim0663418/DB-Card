# BDD Specification: DB-Card 完全後端化架構遷移

**Spec ID**: ARCH-001  
**Version**: 2.0.0 (Updated per ADR-002)  
**Priority**: P0-Critical  
**Owner**: Commander (Centralized Architect)  
**Created**: 2026-01-18T00:39:05+08:00  
**Updated**: 2026-01-18T01:17:25+08:00  
**Supersedes**: ARCH-001 v1.0.0

---

## 1. Executive Summary

### 1.1 Transformation Scope
- **From**: Pure Frontend PWA (v3.2.1)
- **To**: Cloudflare Workers + D1 Database + Frontend
- **Impact**: 架構根本性重構，承擔個資保管責任
- **Timeline**: 4 週分階段遷移
- **Security Model**: Envelope Encryption + ReadSession Authorization (per ADR-002)

### 1.2 Core Principles
1. **Secure by Default**: Envelope Encryption，每張名片獨立 DEK
2. **Privacy by Design**: 最小化資料收集，ReadSession 短期授權
3. **Zero Downtime**: 雙軌運行，平滑遷移
4. **Compliance First**: 符合 GDPR + 台灣個資法
5. **No Cognitive Load**: 唯一交換行為為 NFC 碰卡（無登入/密碼）

---

## 2. Architecture Design

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Refactored)                              │
│  - 名片展示頁面 (從 API 獲取資料)                   │
│  - NFC 生成器 (呼叫 API 創建名片)                   │
│  - PWA 離線快取 (Service Worker)                    │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS + ReadSession
                   ▼
┌─────────────────────────────────────────────────────┐
│  Cloudflare Workers (Edge API)                      │
│  ├─ /api/nfc/tap              [POST] NFC 碰卡簽發   │
│  ├─ /api/cards/:uuid          [GET] 讀取名片        │
│  ├─ /api/cards                [POST] 創建名片       │
│  ├─ /api/cards/:uuid          [PUT] 更新名片        │
│  ├─ /api/cards/:uuid          [DELETE] 刪除名片     │
│  └─ /api/admin/*              [*] 管理後台 API      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Cloudflare D1 Database (SQLite)                    │
│  ├─ cards (名片主表 + Envelope Encryption)          │
│  ├─ read_sessions (ReadSession 授權表)              │
│  ├─ kek_versions (KEK 版本管理)                     │
│  ├─ audit_logs (操作日誌)                           │
│  └─ admin_users (管理員帳號)                        │
└─────────────────────────────────────────────────────┘
```

### 2.2 Database Schema (Updated per ADR-002)

```sql
-- 名片主表 (Envelope Encryption)
CREATE TABLE cards (
  uuid TEXT PRIMARY KEY,                    -- NFC 卡片 UUID
  card_type TEXT NOT NULL,                  -- 'personal' | 'event_booth' | 'sensitive'
  encrypted_payload TEXT NOT NULL,          -- AES-256-GCM 加密的名片資料
  wrapped_dek TEXT NOT NULL,                -- KEK 包裝的 DEK
  key_version INTEGER NOT NULL,             -- KEK 版本
  status TEXT DEFAULT 'active',             -- 'active' | 'suspended' | 'deleted'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  owner_email TEXT,                         -- 擁有者 Email (可選)
  INDEX idx_card_type (card_type),
  INDEX idx_key_version (key_version),
  INDEX idx_status (status)
);

-- ReadSession 授權表 (取代 nfc_tokens)
CREATE TABLE read_sessions (
  session_id TEXT PRIMARY KEY,              -- Session UUID
  card_uuid TEXT NOT NULL,                  -- 關聯的名片 UUID
  issued_at INTEGER NOT NULL,               -- 發行時間
  expires_at INTEGER NOT NULL,              -- 過期時間 (issued_at + 24h)
  max_reads INTEGER NOT NULL,               -- 最大同時讀取數 (Policy 快照)
  reads_used INTEGER DEFAULT 0,             -- 已使用次數
  revoked_at INTEGER,                       -- 撤銷時間
  revoked_reason TEXT,                      -- 'retap' | 'admin' | 'emergency'
  policy_version TEXT,                      -- Policy 快照 JSON
  token_version INTEGER DEFAULT 1,          -- 全站緊急失效用
  FOREIGN KEY (card_uuid) REFERENCES cards(uuid) ON DELETE CASCADE,
  INDEX idx_card_uuid (card_uuid),
  INDEX idx_expires_at (expires_at),
  INDEX idx_token_version (token_version)
);

-- 管理員帳號
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,              -- bcrypt hash
  role TEXT DEFAULT 'viewer',               -- 'admin' | 'editor' | 'viewer'
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  is_active BOOLEAN DEFAULT 1
);
```

### 2.3 Envelope Encryption Strategy (per ADR-002)

```javascript
// 每張名片獨立 DEK
const encryptCardData = async (cardData, kek) => {
  // 1. 生成隨機 DEK
  const dek = crypto.getRandomValues(new Uint8Array(32)); // 256-bit
  
  // 2. 使用 DEK 加密名片資料
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedPayload = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await crypto.subtle.importKey('raw', dek, { name: 'AES-GCM' }, false, ['encrypt']),
    new TextEncoder().encode(JSON.stringify(cardData))
  );
  
  // 3. 使用 KEK 包裝 DEK
  const wrappedDek = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) },
    kek,
    dek
  );
  
  return {
    encrypted_payload: Array.from(new Uint8Array(encryptedPayload)),
    wrapped_dek: Array.from(new Uint8Array(wrappedDek)),
    iv: Array.from(iv)
  };
};
```

---

## 3. API Specification (Updated per ADR-002)

### 3.1 NFC Tap API (New)

#### POST /api/nfc/tap
**Purpose**: NFC 碰卡簽發 ReadSession

**Given**: 
- NFC 卡片 UUID 存在於資料庫
- 卡片狀態為 active

**When**: 
- 客戶端發送 POST 請求到 /api/nfc/tap
- Body 包含: { card_uuid }

**Then**:
- 檢查是否有最近的 ReadSession (10分鐘內 OR reads_used <= 2)
- 如符合條件，撤銷該 session (revoked_reason: 'retap')
- 根據 card_type 獲取 Policy (ttl, max_reads)
- 生成新的 ReadSession (session_id, expires_at = now + 24h)
- 記錄 audit_log (event_type: 'tap')
- 回傳 200 + { session_id, expires_at, max_reads, revoked_previous }

**Error Cases**:
- 404: card_uuid 不存在
- 403: 卡片已停用 (status != 'active')
- 429: Rate limit exceeded (5 req/min per card_uuid)

**BDD Test**:
```gherkin
Scenario: 首次碰卡簽發 ReadSession
  Given 名片 "card-123" 存在且狀態為 active
  When 發送 POST /api/nfc/tap with { card_uuid: "card-123" }
  Then 回傳 200
  And session_id 不為空
  And expires_at = now + 24h
  And max_reads = 20 (Personal 類型)
  And revoked_previous = false

Scenario: 再次碰卡撤銷最近 1 筆
  Given 名片 "card-123" 有一個 5 分鐘前的 ReadSession
  And 該 session 的 reads_used = 1
  When 發送 POST /api/nfc/tap with { card_uuid: "card-123" }
  Then 回傳 200
  And 舊 session 被撤銷 (revoked_reason: 'retap')
  And 新 session_id 不同於舊 session
  And revoked_previous = true
```

---

### 3.2 Card Read API (Updated)

#### GET /api/cards/:uuid?session=:session_id
**Purpose**: 讀取名片資料 (需有效 ReadSession)

**Given**: 
- card_uuid 存在於資料庫
- session_id 有效 (未過期、未撤銷、未達 max_reads)

**When**: 
- 客戶端發送 GET 請求到 /api/cards/{uuid}?session={session_id}

**Then**:
- 驗證 ReadSession 有效性:
  - expires_at > now
  - revoked_at IS NULL
  - reads_used < max_reads
  - token_version 匹配當前版本
- 從 cards 表讀取 encrypted_payload 和 wrapped_dek
- 使用 KEK 解包 DEK
- 使用 DEK 解密 encrypted_payload
- reads_used++
- 記錄 audit_log (event_type: 'read')
- 回傳 200 + { card: {...}, session_info: { reads_remaining, expires_at } }

**Error Cases**:
- 403: session_expired (expires_at <= now)
- 403: session_revoked (revoked_at IS NOT NULL)
- 403: max_reads_exceeded (reads_used >= max_reads)
- 403: token_version_mismatch (緊急失效)
- 404: card_uuid 不存在

**BDD Test**:
```gherkin
Scenario: 有效 ReadSession 讀取名片
  Given 名片 "card-123" 存在
  And ReadSession "sess-456" 有效 (expires_at > now, reads_used = 5, max_reads = 20)
  When 發送 GET /api/cards/card-123?session=sess-456
  Then 回傳 200
  And card 資料包含解密後的姓名、職稱等
  And session_info.reads_remaining = 14
  And reads_used 更新為 6

Scenario: ReadSession 過期
  Given ReadSession "sess-456" 已過期 (expires_at < now)
  When 發送 GET /api/cards/card-123?session=sess-456
  Then 回傳 403
  And error = "session_expired"
  And message = "請再次碰卡以重新取得授權"
```

---

### 3.3 Card Management API (Simplified)

#### POST /api/cards
**Purpose**: 創建新名片 (管理員或自助註冊)

**Given**:
- 請求包含完整的名片資料
- 請求包含管理員 Token (Phase 1) 或通過 CAPTCHA (Phase 2)

**When**:
- 客戶端發送 POST 請求到 /api/cards
- Body 包含: { cardData, cardType }

**Then**:
- 驗證請求者權限
- 生成唯一 UUID (v4)
- 生成隨機 DEK
- 使用 DEK 加密 cardData
- 使用 KEK 包裝 DEK
- 插入 cards 表 (uuid, card_type, encrypted_payload, wrapped_dek, key_version)
- 記錄 audit_log (event_type: 'create')
- 回傳 201 + { uuid, card_type }

**Security**:
- Rate Limiting: 每 IP 每小時最多 10 次創建
- Input Validation: 所有欄位必須通過 XSS 過濾
- PII Masking: 日誌中不記錄完整個資

---

#### PUT /api/cards/:uuid
**Purpose**: 更新名片資料 (需擁有者權限)

**Given**:
- UUID 存在且屬於請求者
- 請求包含有效的擁有者 Token

**When**:
- 客戶端發送 PUT 請求到 /api/cards/{uuid}
- Body 包含更新的名片資料

**Then**:
- 驗證擁有者權限 (owner_email 匹配)
- 生成新的 DEK
- 使用新 DEK 加密資料
- 使用當前 KEK 包裝新 DEK
- 更新 cards 表
- 撤銷所有關聯的 ReadSession (revoked_reason: 'card_updated')
- 記錄 audit_log (event_type: 'update')
- 回傳 200

---

#### DELETE /api/cards/:uuid
**Purpose**: 刪除名片 (軟刪除)

**Given**:
- UUID 存在且請求者有權限

**When**:
- 客戶端發送 DELETE 請求到 /api/cards/{uuid}

**Then**:
- 設置 status = 'deleted' (軟刪除)
- 撤銷所有關聯的 ReadSession (revoked_reason: 'card_deleted')
- 記錄 audit_log (event_type: 'delete')
- 回傳 204 No Content

---

### 3.4 Admin API

#### DELETE /api/admin/sessions/:session_id
**Purpose**: 管理員撤銷 ReadSession

**Given**:
- session_id 存在
- 請求者具有管理員權限

**When**:
- 管理員發送 DELETE 請求到 /api/admin/sessions/{session_id}
- Header 包含: Authorization: Bearer {admin_token}

**Then**:
- 驗證管理員權限
- 設置 revoked_at = now, revoked_reason = 'admin'
- 記錄 audit_log (event_type: 'revoke')
- 回傳 204 No Content

---

#### GET /api/admin/dashboard
**Purpose**: 管理員儀表板統計

**Given**:
- 請求者具有管理員權限

**When**:
- 管理員發送 GET 請求到 /api/admin/dashboard

**Then**:
- 回傳統計數據:
  - 總名片數 (按 card_type 分組)
  - 今日碰卡次數
  - 活躍 ReadSession 數
  - 最近創建的名片 (匿名化)

---

#### POST /api/admin/emergency/revoke-all
**Purpose**: 緊急撤銷所有 ReadSession

**Given**:
- 發生安全事件
- 請求者具有管理員權限

**When**:
- 管理員發送 POST 請求到 /api/admin/emergency/revoke-all

**Then**:
- 提升全站 token_version++
- 所有 ReadSession 立即失效
- 記錄 audit_log (event_type: 'emergency_revoke')
- 回傳 200 + { revoked_count, new_token_version }

---

#### POST /api/admin/kek/rotate
**Purpose**: 輪換 KEK

**Given**:
- 請求者具有管理員權限
- 觸發條件：定期輪換 OR 安全事件

**When**:
- 管理員發送 POST 請求到 /api/admin/kek/rotate

**Then**:
- 生成新的 KEK (version++)
- 更新 kek_versions 表
- 重新包裝所有 cards 的 wrapped_dek
- 記錄 audit_log (event_type: 'kek_rotation')
- 回傳 200 + { new_version, cards_rewrapped }

**Given**:
- 請求者具有管理員權限

**When**:
- 管理員發送 GET 請求到 /api/admin/dashboard

**Then**:
- 回傳統計數據:
  - 總名片數
  - 今日訪問次數
  - 活躍名片數
  - 最近創建的名片 (匿名化)

---

## 4. Security Requirements (Updated per ADR-002)

### 4.1 Authentication & Authorization
- **ReadSession**: 24h TTL, max_reads 限制, 可撤銷
- **Admin Token**: JWT with 24-hour expiry, refresh token support
- **RBAC**: Role-Based Access Control (admin/editor/viewer)
- **No Cognitive Load**: 無登入、密碼、PIN 等機制

### 4.2 Data Protection (Envelope Encryption)
- **Encryption at Rest**: 
  - 每張名片獨立 DEK (AES-256-GCM)
  - DEK 以 KEK 包裝儲存
  - KEK 儲存於 Cloudflare Workers Secrets
- **Encryption in Transit**: TLS 1.3 only
- **Key Rotation**: KEK 定期輪換 (90 天) + 事件觸發
- **PII Masking**: Logs never contain full personal data

### 4.3 Compliance
- **GDPR Article 17**: Right to be forgotten (DELETE API + ReadSession 撤銷)
- **GDPR Article 32**: 適當的技術與組織措施 (Envelope Encryption)
- **台灣個資法第 27 條**: 安全維護措施

### 4.4 Rate Limiting
- **POST /api/nfc/tap**: 5 req/min per card_uuid
- **GET /api/cards/:uuid**: 20 req/min per session_id
- **POST /api/cards**: 10 req/hour per IP
- **Global**: 1000 req/min per IP

### 4.5 Emergency Response (per ADR-002)
- **token_version++**: 全站 ReadSession 立即失效
- **KEK Rotation**: 重新包裝所有 DEK
- **Maintenance Mode**: 短時間停止簽發新 ReadSession

---

## 5. Migration Strategy (Updated)

### Phase 1: Infrastructure Setup (Week 1)
- **Task 1.1**: 建立 Cloudflare Workers 專案
- **Task 1.2**: 初始化 D1 Database + Schema (4 tables)
- **Task 1.3**: 設定 GitHub Actions CI/CD
- **Task 1.4**: 配置 KEK 於 Cloudflare Secrets
- **Task 1.5**: 實作 Envelope Encryption 模組

### Phase 2: Core API Development (Week 2)
- **Task 2.1**: 實作 POST /api/nfc/tap (ReadSession 簽發)
- **Task 2.2**: 實作 GET /api/cards/:uuid (ReadSession 驗證)
- **Task 2.3**: 實作 POST /api/cards (Envelope Encryption)
- **Task 2.4**: 實作撤銷機制 (再次碰卡撤銷最近 1 筆)
- **Task 2.5**: 單元測試 (Jest) + 整合測試

### Phase 3: Frontend Integration (Week 3)
- **Task 3.1**: 重構名片頁面 (ReadSession 流程)
- **Task 3.2**: 重構 NFC 生成器 (呼叫 POST /api/cards)
- **Task 3.3**: 實作 Service Worker 離線快取
- **Task 3.4**: E2E 測試 (Playwright)
- **Task 3.5**: 舊 NFC 卡片遷移工具 (雙軌支援)

### Phase 4: Admin Panel & Go-Live (Week 4)
- **Task 4.1**: 開發管理員後台 (Dashboard + 撤銷功能)
- **Task 4.2**: 實作 KEK 輪換 API
- **Task 4.3**: 實作緊急止血 API (token_version++)
- **Task 4.4**: 安全審計 (OWASP ZAP)
- **Task 4.5**: 生產環境部署

---

## 6. Acceptance Criteria (Updated)

### 6.1 Functional Requirements
- ✅ POST /api/nfc/tap 正常簽發 ReadSession
- ✅ GET /api/cards/:uuid 正確驗證 ReadSession 並解密資料
- ✅ 再次碰卡可撤銷最近 1 筆 ReadSession (10分鐘內 OR reads_used <= 2)
- ✅ ReadSession 過期後強制再次碰卡
- ✅ max_reads 限制生效
- ✅ 管理員可撤銷任意 ReadSession
- ✅ 管理員可觸發緊急止血 (token_version++)

### 6.2 Security Requirements (per ADR-002)
- ✅ 每張名片使用獨立 DEK
- ✅ DEK 以 KEK 包裝儲存，後端從不回傳裸 DEK
- ✅ KEK 輪換功能正常運作
- ✅ 資料庫外洩無法批次解密 (需逐一解包 DEK)
- ✅ Rate Limiting 生效 (429 回應)
- ✅ Audit Logs 完整記錄所有操作 (tap, read, revoke)

### 6.3 Performance Requirements
- ✅ POST /api/nfc/tap 回應時間 < 200ms (P95)
- ✅ GET /api/cards/:uuid 回應時間 < 300ms (P95，含解密)
- ✅ 資料庫查詢 < 50ms (P95)
- ✅ 前端首次載入 < 2s (3G 網路)

### 6.4 Compliance Requirements
- ✅ GDPR 合規檢查通過 (Article 17, 32)
- ✅ 個資法合規文件完成
- ✅ 隱私政策更新並公告 (v2.0.0)

---

## 7. Risk Assessment (Updated)

| 風險 | 影響 | 機率 | 對策 (per ADR-002) |
|------|------|------|-------------------|
| KEK 外洩 | Critical | Low | Cloudflare Secrets + 定期輪換 + 緊急止血 |
| 資料庫外洩 | High | Medium | Envelope Encryption (每張卡獨立 DEK) |
| ReadSession 濫用 | Medium | Medium | max_reads 限制 + Rate Limiting + 可撤銷 |
| 舊 NFC 卡片無法遷移 | Medium | High | 雙軌支援 (API 自動識別舊格式) |
| 合規審查不通過 | High | Low | 提前法務諮詢 + 完整文件 |

---

## 8. Rollback Plan

### 8.1 Rollback Triggers
- API 錯誤率 > 5%
- 資料庫查詢失敗率 > 1%
- 安全事件發生 (KEK 外洩)
- ReadSession 驗證失敗率 > 10%

### 8.2 Rollback Procedure
1. 觸發緊急止血 (token_version++)
2. 切換 DNS 回舊版靜態網站 (如需要)
3. 停用 Cloudflare Workers
4. 通知所有使用者
5. 分析失敗原因並修復
6. 執行 KEK 輪換 (如為金鑰外洩)

---

## 9. Changes from v1.0.0

### 9.1 Removed
- ❌ `nfc_tokens` 表 (15分鐘 JWT Token)
- ❌ `/api/auth/nfc-verify` API
- ❌ 單一主金鑰加密策略

### 9.2 Added
- ✅ `read_sessions` 表 (24h TTL + max_reads)
- ✅ `kek_versions` 表 (KEK 版本管理)
- ✅ `POST /api/nfc/tap` API (ReadSession 簽發)
- ✅ `DELETE /api/admin/sessions/:session_id` API
- ✅ `POST /api/admin/emergency/revoke-all` API
- ✅ `POST /api/admin/kek/rotate` API
- ✅ Envelope Encryption (每張卡獨立 DEK)
- ✅ 撤銷機制 (再次碰卡撤銷最近 1 筆)
- ✅ CardType Policy (Personal/EventBooth/Sensitive)

### 9.3 Modified
- 🔄 `cards` 表: `encrypted_data` → `encrypted_payload` + `wrapped_dek` + `key_version`
- 🔄 `GET /api/cards/:uuid`: 改用 `session_id` 參數取代 JWT Token
- 🔄 `audit_logs` 表: 新增 `session_id` 欄位

---

**[END OF BDD SPECIFICATION v2.0.0]**
