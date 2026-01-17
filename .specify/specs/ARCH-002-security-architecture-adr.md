# Architecture Decision Record: Security-First NFC Card System

**ADR ID**: ARCH-002  
**Status**: ACCEPTED  
**Date**: 2026-01-18  
**Supersedes**: ARCH-001 (部分安全設計)

---

## Context

DB-Card 系統從純前端轉為後端儲存後，面臨關鍵威脅：
- **威脅 1**: 後端資料庫外洩
- **威脅 2**: Cloudflare Workers Secrets 外洩
- **威脅 3**: 兩者同時發生

**核心哲學**：名片不是帳號，不是永久連結，而是「被碰過，才活 24 小時」的交換痕跡。

---

## Decision

### 1. 威脅模型與設計原則

#### 1.1 核心前提（不可變條件）
- ✅ **唯一交換行為**: 實體 NFC 碰卡事件
- ❌ **禁止機制**: 登入、PIN、密碼、驗證碼（增加認知負擔）
- ✅ **可分享性定義**:
  - 碰卡後 24 小時內可回看
  - 過期後唯一方式：再次碰卡

#### 1.2 抗外洩設計目標
- 外洩後無法批次解密
- 授權必須即時、短期、可撤銷
- 攻擊成本遠高於實際價值

---

### 2. 加密架構（Envelope Encryption）

#### 2.1 每張名片一把 DEK
```
名片資料 --[AES-256-GCM(DEK)]--> encrypted_payload
DEK --[AES-256-GCM(KEK)]--> wrapped_dek
```

**關鍵特性**:
- ❌ 不存在「全站單一主金鑰可直接解密所有資料」
- ✅ 後端從不回傳裸 DEK
- ✅ 解密只在記憶體內短暫發生

#### 2.2 金鑰輪換策略
- **輪換對象**: KEK（不是 DEK）
- **觸發條件**: 
  - 定期輪換（建議 90 天）
  - 事件觸發（Secrets 外洩時）
- **版本控制**: key_version 欄位追蹤

---

### 3. ReadSession 授權模型

#### 3.1 ReadSession 定義
> ReadSession 是「一次 NFC 碰卡後，短期有效的可讀取授權」，而非身份或帳號。

#### 3.2 核心屬性
| 屬性 | 值 | 說明 |
|------|-----|------|
| TTL | 24 小時 | 有效時間 |
| max_reads | 20 (預設) | 最大回看次數 |
| revocable | true | 可撤銷 |
| renewable | false | 不可延展 |
| transferable | false | 不可跨卡使用 |

#### 3.3 NFC 卡片內容極小化
```
NFC 卡片僅存: card_uuid (36 bytes)
不存: 加密資料、Token、授權資訊
```

#### 3.4 授權流程
```
1. 碰卡 -> POST /api/nfc/tap
   -> 後端簽發 ReadSession (session_id)

2. 24h 內回看 -> GET /api/cards/:uuid?session=:session_id
   -> 驗證 session 有效性
   -> reads_used++
   -> 回傳解密資料

3. 過期/撤銷 -> 403 Forbidden
   -> 強制再次碰卡
```

---

### 4. 撤銷機制（無登入設計）

#### 4.1 撤銷觸發方式
**Phase 1**: 管理員可撤銷（事件處置）
**Phase 2**: 再次碰卡 = 撤銷最近 1 筆 ReadSession ✅ **已定案**
**Phase 3**: 登入後台自助撤銷（pending）

#### 4.2 再次碰卡撤銷邏輯
```javascript
// POST /api/nfc/tap
if (hasRecentSession(card_uuid)) {
  const lastSession = getLastSession(card_uuid);
  
  // 防誤殺條件（符合其一即可撤銷）
  if (
    (now - lastSession.issued_at) <= 10 * 60 * 1000 || // 10 分鐘內
    lastSession.reads_used <= 2                        // 使用次數 <= 2
  ) {
    revokeSession(lastSession.session_id, 'retap');
  }
}

// 簽發新 ReadSession
return issueNewSession(card_uuid);
```

#### 4.3 撤銷不依賴身份驗證
- ✅ 以「再次 NFC 碰卡」作為唯一行為證據
- ✅ 完全符合既有交換語意
- ❌ 不需要登入、密碼、驗證碼

---

### 5. 名片類型與策略配置（CardType）

#### 5.1 Policy by CardType
不同使用情境 -> 不同安全與分享策略

| CardType | TTL | max_reads | Scope | 說明 |
|----------|-----|-----------|-------|------|
| **Personal** | 24h | 20 | Public + Private | 一般個人名片 |
| **EventBooth** | 24h | 50 | Public only | 展場攤位名片 |
| **Sensitive** | 24h | 5 | Public only | 敏感資訊名片 |

#### 5.2 Policy 快照原則
```javascript
// 簽發 ReadSession 時寫入 policy
const session = {
  session_id: uuid(),
  card_uuid: card.uuid,
  policy_snapshot: {
    ttl: card.policy.ttl,
    max_reads: card.policy.max_reads,
    scope: card.policy.scope
  }
};
```
- ✅ 避免後續政策變更影響既有交換
- ✅ 每次碰卡使用當下最新 policy

---

### 6. 資料結構設計

#### 6.1 Cards 表
```sql
CREATE TABLE cards (
  uuid TEXT PRIMARY KEY,
  card_type TEXT NOT NULL,              -- 'personal' | 'event_booth' | 'sensitive'
  encrypted_payload TEXT NOT NULL,      -- AES-256-GCM 加密的名片資料
  wrapped_dek TEXT NOT NULL,            -- KEK 包裝的 DEK
  key_version INTEGER NOT NULL,         -- KEK 版本
  status TEXT DEFAULT 'active',         -- 'active' | 'suspended' | 'deleted'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  owner_email TEXT,
  INDEX idx_card_type (card_type),
  INDEX idx_key_version (key_version)
);
```

#### 6.2 ReadSessions 表
```sql
CREATE TABLE read_sessions (
  session_id TEXT PRIMARY KEY,
  card_uuid TEXT NOT NULL,
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,          -- issued_at + 24h
  max_reads INTEGER NOT NULL,           -- Policy 快照
  reads_used INTEGER DEFAULT 0,
  revoked_at INTEGER,
  revoked_reason TEXT,                  -- 'retap' | 'admin' | 'emergency'
  policy_version TEXT,                  -- Policy 快照 JSON
  token_version INTEGER DEFAULT 1,      -- 全站緊急失效用
  FOREIGN KEY (card_uuid) REFERENCES cards(uuid) ON DELETE CASCADE,
  INDEX idx_card_uuid (card_uuid),
  INDEX idx_expires_at (expires_at),
  INDEX idx_token_version (token_version)
);
```

#### 6.3 KEK 版本管理表
```sql
CREATE TABLE kek_versions (
  version INTEGER PRIMARY KEY,
  created_at INTEGER NOT NULL,
  rotated_at INTEGER,
  status TEXT DEFAULT 'active'          -- 'active' | 'rotated' | 'compromised'
);
```

---

### 7. API 設計

#### 7.1 NFC 碰卡 API
```
POST /api/nfc/tap
Content-Type: application/json

Request:
{
  "card_uuid": "550e8400-e29b-41d4-a716-446655440000"
}

Response (200):
{
  "session_id": "sess_abc123...",
  "expires_at": "2026-01-19T01:13:43Z",
  "max_reads": 20,
  "reads_used": 0,
  "revoked_previous": false
}
```

#### 7.2 讀取名片 API
```
GET /api/cards/:uuid?session=:session_id

Response (200):
{
  "card": {
    "name": "張三",
    "title": "工程師"
  },
  "session_info": {
    "reads_remaining": 19,
    "expires_at": "2026-01-19T01:13:43Z"
  }
}

Response (403 - Session 過期):
{
  "error": "session_expired",
  "message": "請再次碰卡以重新取得授權"
}
```

#### 7.3 管理員撤銷 API
```
DELETE /api/admin/sessions/:session_id
Authorization: Bearer <admin_token>

Response (204 No Content)
```

---

### 8. 事件處置與止血能力

#### 8.1 全站緊急止血手段
```javascript
// 1. 提升 token_version -> 全部 session 失效
await db.execute(
  "UPDATE read_sessions SET token_version = token_version + 1"
);

// 2. 輪換 KEK
await rotateKEK();

// 3. 停止簽發新 ReadSession（短時間）
await setMaintenanceMode(true, duration: '15m');
```

#### 8.2 止血觸發條件
- Secrets 外洩事件
- 異常大量 API 請求
- 資料庫存取異常
- 管理員手動觸發

---

### 9. 防濫用機制

#### 9.1 Rate Limiting
| 端點 | 限制 | 說明 |
|------|------|------|
| POST /api/nfc/tap | 5 req/min per card_uuid | 防止快速重複碰卡 |
| GET /api/cards/:uuid | 20 req/min per session | 防止批次爬取 |

#### 9.2 異常行為偵測
```javascript
// 動態降載 max_reads
if (detectAbnormalPattern(session_id)) {
  reduceMaxReads(session_id, newLimit: 5);
  logSecurityEvent('abnormal_access', { session_id });
}
```

---

## Consequences

### Positive
- ✅ 資料庫外洩無法批次解密（每張卡獨立 DEK）
- ✅ Secrets 外洩可快速止血（輪換 KEK + token_version）
- ✅ 授權短期有效（24h TTL）
- ✅ 可撤銷（再次碰卡 = 撤銷最近 1 筆）
- ✅ 無認知負擔（無需登入、密碼）

### Negative
- ⚠️ 實作複雜度提升（Envelope Encryption）
- ⚠️ 需要額外儲存空間（wrapped_dek, read_sessions）
- ⚠️ KEK 輪換需要重新包裝所有 DEK

### Risks
- 🔴 KEK 外洩仍可解密所有資料（需依賴 Cloudflare Secrets 安全性）
- 🟡 24h TTL 可能不符合某些使用情境（可透過 CardType 調整）

---

## Compliance

- ✅ GDPR Article 32: 適當的技術與組織措施（加密、撤銷）
- ✅ GDPR Article 17: 刪除權（撤銷 ReadSession）
- ✅ 台灣個資法第 27 條: 安全維護措施

---

**[END OF ADR]**
