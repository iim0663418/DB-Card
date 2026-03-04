# 協同學習系統 v2.0 - 修訂版
# Collaborative Learning System v2.0 - Revised Architecture

**版本**: v2.0.0 (Revised)  
**日期**: 2026-03-04  
**狀態**: 架構修訂 (Architecture Revision)

---

## 🚨 重大架構變更

本版本針對 v1.0 的 6 個高風險問題進行完整重構：

### 修正的問題

1. ✅ **Event-Sourced 模型** - 改為 append-only 事件日誌，可精準回滾
2. ✅ **Schema 相容性** - 沿用既有 job_history，避免 migration 衝突
3. ✅ **明確同意機制** - 預設 opt-in，雙層同意控制
4. ✅ **統一身份解析** - 整合既有 dedup 管線，避免規則漂移
5. ✅ **Pair Canonicalization** - 黑名單使用排序後的 pair key
6. ✅ **D1 相容性** - 所有 SQL 限制在 SQLite-safe subset

---

## 1. 核心架構重構

### 1.1 四層架構

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Identity Resolution (身份解析層)                    │
│ - 判斷是否為同一人                                           │
│ - 輸出: person_candidate, confidence, evidence              │
│ - 不修改任何資料                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Community Signals (社群訊號層)                      │
│ - 新名片視為 signal source                                   │
│ - 每個 signal 帶 source_card, consent, freshness, evidence  │
│ - 不直接覆蓋舊卡                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Review / Policy Engine (審核/策略引擎)              │
│ - 欄位級風險控管                                             │
│ - organization/title: pending update or history event       │
│ - email/phone: 高敏感，只建議不自動覆寫                      │
│ - company_summary: 低風險 enrichment                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Projection Layer (投影層)                           │
│ - 唯一能更新 received_cards 的層                             │
│ - 所有變更來自 event log                                     │
│ - 可重播、可回滾、可審計                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Event-Sourced 資料模型

### 2.1 核心表格：community_update_events

```sql
-- Migration 0036: Event-Sourced Collaborative Learning

CREATE TABLE community_update_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 事件識別
  event_type TEXT NOT NULL,  -- 'match_detected' | 'update_proposed' | 'update_applied' | 'update_revoked'
  event_timestamp INTEGER NOT NULL,
  
  -- 匹配資訊
  target_card_uuid TEXT NOT NULL,
  target_user_email TEXT NOT NULL,
  source_card_uuid TEXT NOT NULL,
  source_user_email TEXT NOT NULL,
  
  -- 身份解析
  person_pair_key TEXT NOT NULL,  -- sort([uuid1, uuid2]).join(':')
  match_confidence INTEGER NOT NULL,
  match_evidence TEXT NOT NULL,  -- JSON: {email_match: true, ...}
  
  -- 變更內容 (JSON)
  field_changes TEXT,  -- {organization: {before: 'ABC', after: 'XYZ'}, ...}
  
  -- 狀態
  status TEXT DEFAULT 'pending',  -- 'pending' | 'applied' | 'revoked' | 'rejected'
  applied_at INTEGER,
  revoked_at INTEGER,
  revoked_reason TEXT,
  
  -- 同意狀態
  source_consent_verified INTEGER DEFAULT 0,
  target_consent_verified INTEGER DEFAULT 0,
  
  FOREIGN KEY (target_card_uuid) REFERENCES received_cards(uuid),
  FOREIGN KEY (source_card_uuid) REFERENCES received_cards(uuid)
);

CREATE INDEX idx_community_events_target ON community_update_events(target_card_uuid);
CREATE INDEX idx_community_events_source ON community_update_events(source_card_uuid);
CREATE INDEX idx_community_events_pair ON community_update_events(person_pair_key);
CREATE INDEX idx_community_events_status ON community_update_events(status);
CREATE INDEX idx_community_events_timestamp ON community_update_events(event_timestamp);
```

### 2.2 欄位級變更追蹤

```sql
CREATE TABLE card_field_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 關聯事件
  event_id INTEGER NOT NULL,
  card_uuid TEXT NOT NULL,
  
  -- 欄位變更
  field_name TEXT NOT NULL,
  value_before TEXT,
  value_after TEXT,
  change_type TEXT NOT NULL,  -- 'update' | 'append' | 'enrich'
  
  -- 風險等級
  risk_level TEXT NOT NULL,  -- 'low' | 'medium' | 'high'
  requires_review INTEGER DEFAULT 0,
  
  -- 狀態
  applied INTEGER DEFAULT 0,
  applied_at INTEGER,
  
  FOREIGN KEY (event_id) REFERENCES community_update_events(id),
  FOREIGN KEY (card_uuid) REFERENCES received_cards(uuid)
);

CREATE INDEX idx_field_changes_event ON card_field_changes(event_id);
CREATE INDEX idx_field_changes_card ON card_field_changes(card_uuid);
CREATE INDEX idx_field_changes_field ON card_field_changes(field_name);
```

---

## 3. 同意管理機制

### 3.1 使用者同意表

```sql
CREATE TABLE user_consent_settings (
  user_email TEXT PRIMARY KEY,
  
  -- 雙層同意
  contribute_to_community INTEGER DEFAULT 0,  -- 我的名片可作為來源
  allow_community_updates INTEGER DEFAULT 0,  -- 允許更新我的名片
  
  -- 細粒度控制
  allow_job_updates INTEGER DEFAULT 0,
  allow_contact_updates INTEGER DEFAULT 0,
  allow_enrichment INTEGER DEFAULT 1,  -- 低風險預設開啟
  
  -- 通知偏好
  notify_on_updates INTEGER DEFAULT 1,
  auto_accept_high_confidence INTEGER DEFAULT 0,  -- >= 0.95
  
  -- 審計
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  consent_version TEXT DEFAULT 'v1.0'
);

CREATE INDEX idx_consent_contribute ON user_consent_settings(contribute_to_community);
CREATE INDEX idx_consent_allow ON user_consent_settings(allow_community_updates);
```

### 3.2 同意檢查邏輯

```typescript
/**
 * 檢查雙層同意
 */
async function checkConsent(
  env: Env,
  sourceUser: string,
  targetUser: string
): Promise<{ canProceed: boolean; reason?: string }> {
  
  // 1. 檢查來源使用者同意貢獻
  const sourceConsent = await env.DB.prepare(`
    SELECT contribute_to_community FROM user_consent_settings
    WHERE user_email = ?
  `).bind(sourceUser).first();
  
  if (!sourceConsent || !sourceConsent.contribute_to_community) {
    return { canProceed: false, reason: 'source_not_consented' };
  }
  
  // 2. 檢查目標使用者允許更新
  const targetConsent = await env.DB.prepare(`
    SELECT allow_community_updates FROM user_consent_settings
    WHERE user_email = ?
  `).bind(targetUser).first();
  
  if (!targetConsent || !targetConsent.allow_community_updates) {
    return { canProceed: false, reason: 'target_not_consented' };
  }
  
  return { canProceed: true };
}
```

---

## 4. 統一身份解析層

### 4.1 整合既有 dedup 管線

```typescript
/**
 * 統一身份解析 (整合既有 deduplicate-cards.ts)
 */
async function resolveIdentity(
  env: Env,
  cardA: any,
  cardB: any
): Promise<{
  isSamePerson: boolean;
  confidence: number;
  evidence: Record<string, any>;
}> {
  
  // 重用既有 dedup 邏輯
  const { calculateStringSimilarity } = await import('./deduplicate-cards');
  const { checkPersonIdentity, checkCompanyRelationship } = await import('./deduplicate-cards');
  
  // 1. Email 完全匹配 (最高優先級)
  if (cardA.email && cardA.email === cardB.email) {
    return {
      isSamePerson: true,
      confidence: 1.00,
      evidence: { email_exact_match: true }
    };
  }
  
  // 2. 電話完全匹配
  if (cardA.phone && cardA.phone === cardB.phone) {
    return {
      isSamePerson: true,
      confidence: 0.95,
      evidence: { phone_exact_match: true }
    };
  }
  
  // 3. 字串相似度 + FileSearchStore 上下文
  const stringSim = calculateStringSimilarity(cardA, cardB);
  
  if (stringSim.score >= 50 && stringSim.score <= 90) {
    // 灰色地帶：使用 FileSearchStore 增強
    const personResult = await checkPersonIdentity(env, cardA, cardB);
    const companyResult = await checkCompanyRelationship(env, cardA.organization, cardB.organization);
    
    if (personResult.isSamePerson && companyResult.isSameCompany) {
      return {
        isSamePerson: true,
        confidence: Math.max(0.95, personResult.confidence / 100),
        evidence: {
          string_similarity: stringSim.score,
          person_match: personResult.reason,
          company_match: companyResult.reason
        }
      };
    }
  }
  
  return {
    isSamePerson: false,
    confidence: stringSim.score / 100,
    evidence: { string_similarity: stringSim.score }
  };
}
```

---

## 5. Pair Canonicalization

### 5.1 黑名單改進

```sql
CREATE TABLE matching_blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Canonicalized pair key
  person_pair_key TEXT NOT NULL UNIQUE,  -- sort([uuid1, uuid2]).join(':')
  
  -- 原因與時效
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  
  -- 審計
  created_by TEXT,
  notes TEXT
);

CREATE INDEX idx_blacklist_pair ON matching_blacklist(person_pair_key);
CREATE INDEX idx_blacklist_expires ON matching_blacklist(expires_at);
```

### 5.2 Pair Key 生成

```typescript
/**
 * 生成 canonicalized pair key
 */
function generatePairKey(uuid1: string, uuid2: string): string {
  return [uuid1, uuid2].sort().join(':');
}

/**
 * 檢查黑名單 (方向無關)
 */
async function isBlacklisted(
  env: Env,
  uuid1: string,
  uuid2: string
): Promise<boolean> {
  
  const pairKey = generatePairKey(uuid1, uuid2);
  const now = Date.now();
  
  const result = await env.DB.prepare(`
    SELECT 1 FROM matching_blacklist
    WHERE person_pair_key = ?
      AND (expires_at IS NULL OR expires_at > ?)
    LIMIT 1
  `).bind(pairKey, now).first();
  
  return !!result;
}
```

---

## 6. D1 相容性約束

### 6.1 SQLite-Safe SQL

```sql
-- ❌ 錯誤：GREATEST() 不是標準 SQLite
UPDATE received_cards
SET community_update_count = GREATEST(0, community_update_count - 1);

-- ✅ 正確：使用 MAX()
UPDATE received_cards
SET community_update_count = MAX(0, community_update_count - 1);

-- ❌ 錯誤：CLAMP() 不存在
UPDATE user_reputation
SET reputation_score = CLAMP(reputation_score + ?, 0, 100);

-- ✅ 正確：使用 MIN(MAX(...))
UPDATE user_reputation
SET reputation_score = MIN(100, MAX(0, reputation_score + ?));
```

### 6.2 JSON 處理

```sql
-- ❌ 錯誤：直接使用 JSON functions (D1 可能不支援)
SELECT json_extract(field_changes, '$.organization') FROM community_update_events;

-- ✅ 正確：在應用層處理 JSON
-- TypeScript: JSON.parse(row.field_changes)
```

---

## 7. 修訂後的實施路徑

### Phase A: 候選匹配 (2 週)

**目標**: 只產生候選，不自動更新

**任務**:
- [ ] 實作 `resolveIdentity()` (整合既有 dedup)
- [ ] 實作 `community_update_events` 表 (event_type = 'match_detected')
- [ ] 實作 `generatePairKey()` 與黑名單檢查
- [ ] 量測 precision / false positive

**交付物**:
- 候選匹配列表
- Precision 報告 (目標 > 90%)

---

### Phase B: 低風險投影 (2 週)

**目標**: 只做 job_history append 和缺欄位 enrichment

**任務**:
- [ ] 實作 `card_field_changes` 表
- [ ] 實作欄位級風險評估
- [ ] 實作 `projectionLayer()` (只處理 low risk)
- [ ] 沿用既有 `job_history` 欄位

**交付物**:
- 低風險欄位自動更新
- 回滾測試通過

---

### Phase C: 同意 + 審核 UI (3 週)

**目標**: 使用者確認或拒絕，收集標註資料

**任務**:
- [ ] 實作 `user_consent_settings` 表
- [ ] 實作同意檢查邏輯
- [ ] 實作審核 UI (pending updates)
- [ ] 實作使用者回饋收集

**交付物**:
- 同意管理介面
- 審核 UI
- 標註資料集

---

### Phase D: 高信心自動應用 (2 週)

**目標**: 只限高 precision、低敏感欄位

**任務**:
- [ ] 實作自動應用策略 (confidence >= 0.95, risk = low)
- [ ] 實作監控告警
- [ ] 實作 A/B 測試

**交付物**:
- 自動應用機制
- 監控 Dashboard

---

### 總時程: 9 週 (vs. 原 14 週)

| Phase | 時間 | 風險 | 價值 |
|-------|------|------|------|
| Phase A | 2 週 | 低 | 驗證可行性 |
| Phase B | 2 週 | 低 | 低風險價值 |
| Phase C | 3 週 | 中 | 使用者控制 |
| Phase D | 2 週 | 中 | 自動化價值 |
| **總計** | **9 週** | | |

---

## 8. 關鍵差異總結

| 面向 | v1.0 (原版) | v2.0 (修訂版) |
|------|------------|--------------|
| **資料模型** | 直接改寫 received_cards | Event-sourced, append-only |
| **回滾機制** | 推測式回滾 (不準確) | 事件標記 revoked + 重算投影 |
| **同意控制** | 後置，無 persistence | 前置，雙層同意，資料庫持久化 |
| **身份解析** | 獨立管線 | 整合既有 dedup 管線 |
| **黑名單** | 方向相關 (可繞過) | Canonicalized pair key |
| **SQL 相容性** | 使用非標準函數 | SQLite-safe subset |
| **實施順序** | 14 週全功能 | 9 週分階段驗證 |

---

## 9. 風險緩解

### v1.0 的 6 個高風險問題

| # | 問題 | v2.0 解決方案 | 狀態 |
|---|------|--------------|------|
| 1 | 無可逆變更模型 | Event-sourced + projection | ✅ 已解決 |
| 2 | job_history 重複定義 | 沿用既有欄位 | ✅ 已解決 |
| 3 | 無明確同意閘門 | 雙層同意 + 前置檢查 | ✅ 已解決 |
| 4 | 第二套管線 | 整合既有 dedup | ✅ 已解決 |
| 5 | 黑名單可繞過 | Pair canonicalization | ✅ 已解決 |
| 6 | SQL 不相容 | SQLite-safe subset | ✅ 已解決 |

---

## 10. 下一步

### 立即行動

1. **Phase 0**: 修復當前去重功能 (1 週)
   - 讓使用者看到去重效果
   - 驗證 FileSearchStore 價值

2. **Phase A**: 候選匹配 (2 週)
   - 只產生候選，不自動更新
   - 量測 precision

3. **決策點**: Phase A 完成後評估
   - 若 precision > 90%，繼續 Phase B
   - 若 precision < 90%，優化演算法

---

## 附錄：架構決策記錄

### ADR-006: Event-Sourced Collaborative Learning

**決策**: 採用 Event-Sourced 架構，而非直接改寫主表

**理由**:
1. 可精準回滾 (標記 revoked 而非推測)
2. 完整審計追蹤
3. 可重播事件 (debugging / testing)
4. 支援複雜的衝突解決

**代價**:
1. 增加儲存空間 (~20%)
2. 查詢需要 projection (增加複雜度)
3. 需要 materializer 維護

**結論**: 代價可接受，架構穩定性提升顯著。

---

**文檔結束**

**下一步**: 開始 Phase 0 (修復當前去重功能)
