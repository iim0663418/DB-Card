# DB-Card 完整系統架構 v4.x

## 文檔版本
- 版本: v4.2.0-PLANNING
- 日期: 2026-01-20
- 狀態: 規劃中

---

## 目錄

1. [產品定位](#產品定位)
2. [核心架構](#核心架構)
3. [Session 管理機制](#session-管理機制)
4. [多層防護體系](#多層防護體系)
5. [名片類型策略](#名片類型策略)
6. [API 端點規格](#api-端點規格)
7. [資料庫結構](#資料庫結構)
8. [前端流程](#前端流程)
9. [版本演進路線](#版本演進路線)

---

## 產品定位

### 核心定義
```
產品類型：數位名片系統
核心價值：易於分享、易於傳播
資料性質：公開資訊（姓名、電話、Email）
安全策略：資源管理，非訪問控制
```

### 設計原則
1. **易於分享** - 不需要複雜授權
2. **易於傳播** - QR Code、URL 分享
3. **服務穩定** - 多層防護保護服務可用性
4. **可追蹤** - 完整審計日誌
5. **可撤銷** - Session 管理機制

### 不是什麼
- ❌ 不是授權系統（不需要身份驗證）
- ❌ 不是訪問控制系統（不限制誰能訪問）
- ❌ 不是機密資料保護系統（資料本質上是公開的）

---

## 核心架構

### 系統組件

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Frontend   │  │   API Layer  │  │  Crypto Layer│      │
│  │  (Static)    │  │  (Handlers)  │  │  (Envelope)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│         ┌──────────────────┴──────────────────┐             │
│         │                                      │             │
│    ┌────▼────┐                          ┌─────▼─────┐       │
│    │ D1 DB   │                          │  KV Store │       │
│    │(SQLite) │                          │ (Dedup +  │       │
│    └─────────┘                          │  Cache +  │       │
│                                         │  Counter) │       │
│                                         └───────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 技術棧
- **Runtime**: Cloudflare Workers (V8 isolates)
- **Language**: TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **KV Store**: Cloudflare KV
- **Crypto**: Web Crypto API (Envelope Encryption)
- **Frontend**: Vanilla JS + Tailwind CSS

---

## Session 管理機制

### Session 的本質

```typescript
// Session 是「名片的臨時副本」，不是「身份驗證令牌」
interface ReadSession {
  session_id: string;           // UUID v4
  card_uuid: string;            // 關聯的名片
  issued_at: number;            // 創建時間
  expires_at: number;           // 過期時間（24h）
  max_reads: number;            // 最大同時讀取數（併發限制）
  reads_used: number;           // 當前讀取數
  revoked_at: number | null;    // 撤銷時間
  token_version: number;        // Token 版本（用於全域撤銷）
}
```

### Session 生命週期

```
1. 創建（Creation）
   ├─ NFC 觸碰 → POST /api/nfc/tap
   ├─ URL 分享（無 session）→ 自動調用 tap
   └─ 返回 session_id

2. 使用（Usage）
   ├─ GET /api/read?session={id}
   ├─ 檢查有效性（expires_at, revoked_at）
   ├─ 檢查併發限制（reads_used < max_reads）
   └─ 返回名片資料

3. 撤銷（Revocation）
   ├─ 重新觸碰 NFC（10分鐘內 OR reads_used ≤ 2）
   ├─ 用戶自行撤銷（User Portal）
   ├─ 管理員撤銷（Admin Dashboard）
   └─ 全域撤銷（KEK 輪換）

4. 過期（Expiration）
   └─ 24 小時後自動失效
```

### Session 不追蹤的內容

```
❌ 不追蹤裝置（Device）
❌ 不追蹤用戶身份（User Identity）
❌ 不追蹤傳遞深度（Propagation Depth）- 基於外部研究決定
❌ 不追蹤父子關係（Parent-Child）
```

### Session 追蹤的內容

```
✅ 創建時間和過期時間
✅ 使用次數（併發控制）
✅ 撤銷狀態
✅ 關聯的名片 UUID
✅ IP 地址（僅用於速率限制和審計）
```

---

## 多層防護體系

### v4.1.0 已實作（Phase 1 - P0）

#### Layer 0: Basic Validation
```typescript
// 基礎驗證
- HTTP Method 檢查
- 參數存在性檢查
- UUID v4 格式驗證

錯誤碼: 400 Bad Request
```

#### Layer 1: Deduplication (60s)
```typescript
// 去重機制
Key: tap:dedup:${card_uuid}
Value: session_id (string)
TTL: 60 seconds

目的:
✅ 防止誤觸（用戶不小心重複碰卡）
✅ 防止爬蟲瞬間爆量（同一卡片）
✅ 減少不必要的資源消耗

行為:
- 60 秒內重複請求返回相同 session
- 返回 reused: true 標記
- 不增加速率限制計數器
- 無繞過機制（包含管理員）

錯誤碼: 200 OK (reused: true)
```

#### Layer 2: Rate Limiting
```typescript
// 速率限制（雙維度）
算法: Sliding Window Counter

Card UUID 維度:
- ratelimit:card:${card_uuid}:minute → 10 次/分鐘
- ratelimit:card:${card_uuid}:hour → 50 次/小時
- TTL: 120s (minute), 7200s (hour)

IP 維度:
- ratelimit:ip:${ip}:minute → 10 次/分鐘
- ratelimit:ip:${ip}:hour → 60 次/小時
- TTL: 120s (minute), 7200s (hour)

KV 存儲格式:
{
  "count": number,
  "first_seen_at": timestamp
}

目的:
✅ 防止單一卡片被過度訪問
✅ 防止單一 IP 濫用服務
✅ 確保服務對所有用戶可用

錯誤碼: 429 Too Many Requests
錯誤回應包含: retry_after, limit_scope, window, limit, current
```

#### Layer 3: Card Validation
```typescript
// 名片驗證
檢查項目:
1. 名片是否存在（cards + uuid_bindings JOIN）
2. 名片是否被撤銷（uuid_bindings.status = 'revoked'）

錯誤碼:
- 404 Not Found (card_not_found)
- 403 Forbidden (card_revoked)
```

#### Layer 4: Retap Revocation
```typescript
// 重新觸碰撤銷機制
條件:
- 距離上次 tap 不超過 10 分鐘
- 上一個 session 讀取次數不超過 2 次

行為:
- 自動撤銷舊 session
- 創建新 session
- 記錄 audit log

目的:
✅ 允許用戶快速更新 session
✅ 防止舊 session 繼續被使用
```

#### Layer 5: Max Reads (Concurrent Limit)
```typescript
// 併發讀取限制
位置: handlers/read.ts

檢查邏輯:
if (session.reads_used >= session.max_reads) {
  return 403; // 已達同時讀取數上限
}

// reads_used 在讀取開始時 +1，結束時 -1

目的:
✅ 防止 session token 外洩後被大量並發使用
✅ 限制同時讀取的數量

錯誤碼: 403 Forbidden (max_reads_exceeded)
```

### 執行順序

```
Request → POST /api/nfc/tap {card_uuid}
    ↓
Step 0: Basic Validation
    ├─ 檢查 HTTP Method
    ├─ 檢查 card_uuid 存在
    └─ 驗證 UUID v4 格式
    → 失敗: 400 Bad Request
    ↓
Step 1: Dedup Check
    ├─ 查詢 KV: tap:dedup:${card_uuid}
    ├─ 如果存在: 返回現有 session (reused: true)
    └─ 如果不存在: 繼續
    → 命中: 200 OK (reused: true, 跳過後續步驟)
    ↓
Step 2: Rate Limit Check (並行檢查 4 個維度)
    ├─ Card UUID: minute (10)
    ├─ Card UUID: hour (50)
    ├─ IP: minute (10)
    └─ IP: hour (60)
    → 失敗: 429 Too Many Requests
    ↓
Step 3: Card Validation
    ├─ 查詢 cards + uuid_bindings
    ├─ 檢查存在性
    └─ 檢查撤銷狀態
    → 失敗: 404 Not Found / 403 Forbidden
    ↓
Step 4: Retap Revocation
    ├─ 查詢最近的 session
    ├─ 檢查是否符合撤銷條件
    └─ 如果符合: 撤銷舊 session
    ↓
Step 5: Create Session + Store Dedup + Increment Counters
    ├─ 創建新 session
    ├─ 存儲 dedup entry (TTL: 60s)
    ├─ 並行增加 4 個 rate limit counters
    └─ 返回 session_id (reused: false)
    → 成功: 200 OK
```

---

## 名片類型策略

### Policy 定義

```typescript
const CARD_POLICIES = {
  personal: {
    ttl_hours: 24,
    max_reads: 20,  // 併發讀取限制
    description: '個人名片'
  },
  event_booth: {
    ttl_hours: 24,
    max_reads: 50,  // 展會需要更高併發
    description: '展會攤位'
  },
  sensitive: {
    ttl_hours: 24,
    max_reads: 5,   // 敏感資訊嚴格限制
    description: '敏感資訊'
  }
};
```

### 策略對比

| 類型 | TTL | 最大同時讀取數 | Rate Limit (Card) | 使用場景 |
|------|-----|---------------|------------------|---------|
| personal | 24h | 20 | 10/min, 50/hour | 個人名片 |
| event_booth | 24h | 50 | 10/min, 50/hour | 展會攤位 |
| sensitive | 24h | 5 | 10/min, 50/hour | 敏感資訊 |

**注意**: Rate Limit 在 v4.1.0 中是統一的（10/min, 50/hour），未來可考慮動態調整。

---

## API 端點規格

### 公開 API

#### POST /api/nfc/tap
```typescript
// 創建 ReadSession

Request:
{
  card_uuid: string  // UUID v4 格式
}

Response (Success - New Session):
{
  session_id: string,
  expires_at: number,
  max_reads: number,
  reads_used: number,
  revoked_previous: boolean,
  reused: false
}

Response (Success - Dedup Hit):
{
  session_id: string,
  expires_at: number,
  max_reads: number,
  reads_used: number,
  reused: true
}

Response (Error - Rate Limited):
{
  error: "rate_limited",
  message: "請求過於頻繁，請稍後再試",
  retry_after: number,
  limit_scope: "card_uuid" | "ip",
  window: "minute" | "hour",
  limit: number,
  current: number
}

Status Codes:
- 200: Success
- 400: Invalid Request (bad UUID format)
- 403: Forbidden (card revoked)
- 404: Not Found (card not found)
- 429: Too Many Requests (rate limited)
- 500: Internal Server Error
```

#### GET /api/read
```typescript
// 讀取名片資料

Query Parameters:
- session: string (required)

Response (Success):
{
  data: CardData,
  session_info: {
    expires_at: number,
    reads_remaining: number  // max_reads - reads_used
  }
}

Response (Error):
{
  error: string,
  message: string,
  reason?: string
}

Status Codes:
- 200: Success
- 400: Invalid Request
- 403: Forbidden (session expired/revoked/max_reads exceeded)
- 404: Not Found (session not found)
- 500: Internal Server Error
```

#### GET /health
```typescript
// 系統健康檢查

Response:
{
  success: true,
  data: {
    status: "ok",
    database: "connected",
    kek: "configured",
    kek_version: string,
    active_cards: number,
    timestamp: number
  }
}
```

### 管理 API（需認證）

完整列表請參考 `docs/api/admin-apis.md`

---

## 資料庫結構

### 核心表

#### cards
```sql
CREATE TABLE cards (
  uuid TEXT PRIMARY KEY,
  encrypted_payload TEXT NOT NULL,
  wrapped_dek TEXT NOT NULL,
  key_version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

#### uuid_bindings
```sql
CREATE TABLE uuid_bindings (
  uuid TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('personal', 'event', 'sensitive')),
  status TEXT NOT NULL DEFAULT 'bound' CHECK(status IN ('bound', 'revoked')),
  bound_email TEXT,
  bound_at INTEGER,
  revoked_at INTEGER,
  revoke_reason TEXT,
  FOREIGN KEY (uuid) REFERENCES cards(uuid)
);
```

#### read_sessions
```sql
CREATE TABLE read_sessions (
  session_id TEXT PRIMARY KEY,
  card_uuid TEXT NOT NULL,
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  max_reads INTEGER NOT NULL,
  reads_used INTEGER NOT NULL DEFAULT 0,
  revoked_at INTEGER,
  revoke_reason TEXT,
  token_version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (card_uuid) REFERENCES cards(uuid)
);
```

#### audit_logs
```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  card_uuid TEXT,
  session_id TEXT,
  actor_type TEXT,
  actor_id TEXT,
  target_uuid TEXT,
  ip_address TEXT,
  details TEXT,
  created_at INTEGER NOT NULL
);
```

### KV 存儲結構

```typescript
// Dedup
Key: tap:dedup:${card_uuid}
Value: session_id (string)
TTL: 60 seconds

// Rate Limit - Card UUID
Key: ratelimit:card:${card_uuid}:minute
Value: {"count": number, "first_seen_at": number}
TTL: 120 seconds

Key: ratelimit:card:${card_uuid}:hour
Value: {"count": number, "first_seen_at": number}
TTL: 7200 seconds

// Rate Limit - IP
Key: ratelimit:ip:${ip}:minute
Value: {"count": number, "first_seen_at": number}
TTL: 120 seconds

Key: ratelimit:ip:${ip}:hour
Value: {"count": number, "first_seen_at": number}
TTL: 7200 seconds

// Read Cache (Optional)
Key: read:cache:${card_uuid}:${session_id}
Value: {data: CardData, session_info: SessionInfo}
TTL: 60 seconds
```

---

## 前端流程

### 名片顯示頁面（card-display.html）

```javascript
// 1. 解析 URL 參數
const params = new URLSearchParams(window.location.search);
const uuid = params.get('uuid');
const session = params.get('session');

// 2. 判斷是否需要創建 session
if (!session) {
  // 沒有 session → 自動創建（NFC 觸碰或 URL 分享）
  const tapResult = await tapCard(uuid);
  sessionId = tapResult.session_id;
  
  // 更新 URL（可選）
  // window.history.replaceState({}, '', `?uuid=${uuid}&session=${sessionId}`);
} else {
  // 有 session → 直接使用
  sessionId = session;
}

// 3. 讀取名片資料
const readResult = await readCard(uuid, sessionId);
displayCard(readResult.data);

// 4. 處理錯誤
if (error.code === 'rate_limited') {
  showError(`請求過於頻繁，請 ${error.retry_after} 秒後再試`);
} else if (error.code === 'max_reads_exceeded') {
  showError('已達同時讀取數上限，請重新觸碰 NFC 卡片取得新授權');
}
```

### 分享機制

```javascript
// QR Code 生成
function generateQRCode() {
  const uuid = params.get('uuid');
  // 只分享 uuid，不分享 session
  const shareUrl = `${window.location.origin}/card-display.html?uuid=${uuid}`;
  new QRCode(container, { text: shareUrl });
}

// 複製連結
function copyShareLink() {
  const uuid = params.get('uuid');
  // 只分享 uuid，不分享 session
  const shareUrl = `${window.location.origin}/card-display.html?uuid=${uuid}`;
  navigator.clipboard.writeText(shareUrl);
}
```

**關鍵設計**：
- ✅ 分享時只傳 uuid，不傳 session
- ✅ 每個用戶自動創建新 session
- ✅ 符合「易於分享」的產品定位

---

## 版本演進路線

### v4.1.0 ✅ 已完成（2026-01-20）
- Multi-Layer Defense (Dedup + Rate Limit)
- 60 秒去重機制
- 雙維度速率限制（Card UUID + IP）
- Sliding Window Counter 算法
- IP 優先提取（CF-Connecting-IP）
- 完整 BDD 規格（11 scenarios）
- 本地測試通過（6/6）

### v4.2.0 📋 規劃中（基於外部研究）
**不實作傳遞深度限制**，改用業界主流做法：

#### 選項 A：總量限制（推薦）✅
```typescript
// 追蹤每張卡片的 session 總數
ALTER TABLE cards ADD COLUMN total_sessions INTEGER DEFAULT 0;

// Policy 定義
const CARD_POLICIES = {
  personal: {
    max_total_sessions: 1000,     // 總共最多 1000 個 session
    max_sessions_per_day: 10,     // 每天最多 10 個
    max_sessions_per_month: 100   // 每月最多 100 個
  },
  event_booth: {
    max_total_sessions: 5000,
    max_sessions_per_day: 50,
    max_sessions_per_month: 500
  },
  sensitive: {
    max_total_sessions: 100,
    max_sessions_per_day: 3,
    max_sessions_per_month: 30
  }
};

// 檢查邏輯
if (card.total_sessions >= policy.max_total_sessions) {
  return {
    warning: 'session_limit_reached',
    message: '此名片已達到分享上限，建議直接聯繫持有人',
    restricted_features: ['share']
  };
}
```

#### 選項 B：異常檢測
```typescript
// 檢測異常模式
const anomaly = await detectAnomaly({
  card_uuid,
  ip_address,
  time_window: '1h',
  threshold: 20  // 1 小時內超過 20 次
});

if (anomaly.detected) {
  await logSecurityEvent('anomaly_detected', {
    pattern: anomaly.pattern,
    severity: anomaly.severity
  });
  
  // 可選：暫時限制
  if (anomaly.severity === 'high') {
    return 429; // 暫時限制
  }
}
```

**理由**：
- ✅ 有成功案例（Dropbox, PayPal）
- ✅ 實作簡單（不需要追蹤傳遞鏈）
- ✅ 效果明確（總量上限 + 異常檢測）
- ✅ 符合產品定位（易於分享）

### v4.3.0 📋 未來規劃
- 傳播統計與分析
- 管理後台整合
- 智能建議（根據使用情況調整策略）
- 可視化報表

---

## 機制完整性檢查

### ✅ 已實作且運作正常

1. **Session 管理** ✅
   - 創建、使用、撤銷、過期
   - 24 小時 TTL
   - 併發讀取限制

2. **多層防護** ✅
   - Layer 0: Basic Validation
   - Layer 1: Dedup (60s)
   - Layer 2: Rate Limit (Card + IP)
   - Layer 3: Card Validation
   - Layer 4: Retap Revocation
   - Layer 5: Max Reads

3. **審計追蹤** ✅
   - 完整 audit_logs
   - IP 匿名化
   - 事件類型分類

4. **撤銷機制** ✅
   - 重新觸碰撤銷
   - 用戶自行撤銷
   - 管理員撤銷
   - 全域撤銷（KEK 輪換）

5. **加密機制** ✅
   - 信封加密（Envelope Encryption）
   - 每張名片獨立 DEK
   - KEK 輪換機制

### 📋 規劃中（v4.2.0）

1. **總量限制**
   - 追蹤 total_sessions
   - 每日/每月限制
   - 軟性警告機制

2. **異常檢測**
   - 行為模式分析
   - 自動警報
   - 可選的暫時限制

### ❌ 不實作

1. **傳遞深度限制**
   - 理由：沒有業界案例
   - 理由：技術複雜，價值有限
   - 理由：容易繞過

2. **裝置追蹤**
   - 理由：違背產品定位
   - 理由：破壞分享功能

3. **訪問控制**
   - 理由：名片資料是公開的
   - 理由：不需要身份驗證

---

## 總結

### 系統特點

1. **清晰的產品定位** ✅
   - 數位名片系統，不是授權系統
   - 易於分享，易於傳播
   - 保護服務，不保護資料

2. **完整的防護體系** ✅
   - 5 層防護（v4.1.0）
   - 互補而不重疊
   - 軟性限制為主

3. **符合業界最佳實踐** ✅
   - 參考 Dropbox, PayPal
   - 總量限制 + 異常檢測
   - 不使用傳遞深度限制

4. **良好的用戶體驗** ✅
   - 自動創建 session
   - 清晰的錯誤訊息
   - 不破壞分享功能

5. **完整的審計追蹤** ✅
   - 記錄所有關鍵事件
   - IP 匿名化保護隱私
   - 支援合規要求

---

**文檔狀態**: ✅ 完整  
**機制一致性**: ✅ 已驗證  
**準備狀態**: ✅ 可開始 v4.2.0 開發
