# Phase A: 候選匹配實施計畫
# Cross-User Candidate Matching Implementation Plan

**版本**: v1.0.0  
**日期**: 2026-03-04  
**預計時程**: 2 週  
**狀態**: 規劃階段

---

## 目標 (Objectives)

1. **實作跨使用者身份識別** - 判斷不同使用者的名片是否為同一人
2. **只產生候選** - 不自動更新任何名片，只記錄匹配候選
3. **量測 precision** - 目標準確率 > 90%

---

## 核心原則

### ✅ 做什麼
- 產生跨使用者匹配候選
- 記錄匹配信心度與證據
- 整合既有 dedup 邏輯
- 量測準確率

### ❌ 不做什麼
- 不自動更新任何名片
- 不修改 received_cards 表
- 不通知使用者
- 不執行任何寫入操作（除了記錄候選）

---

## 資料庫設計

### Migration 0036: Cross-User Candidate Matching

```sql
-- Migration 0036: Phase A - Candidate Matching Only

-- 1. 跨使用者匹配候選表
CREATE TABLE cross_user_match_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 匹配的兩張名片
  card_a_uuid TEXT NOT NULL,
  card_a_user TEXT NOT NULL,
  card_b_uuid TEXT NOT NULL,
  card_b_user TEXT NOT NULL,
  
  -- Canonicalized pair key (方向無關)
  person_pair_key TEXT NOT NULL,
  
  -- 匹配資訊
  match_confidence INTEGER NOT NULL,  -- 85-100
  match_method TEXT NOT NULL,         -- 'email_exact' | 'phone_exact' | 'context_match'
  match_evidence TEXT NOT NULL,       -- JSON: {email_match: true, ...}
  
  -- 時間戳
  detected_at INTEGER NOT NULL,
  
  -- 驗證狀態 (用於量測 precision)
  validation_status TEXT DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'rejected'
  validated_at INTEGER,
  validated_by TEXT,
  
  FOREIGN KEY (card_a_uuid) REFERENCES received_cards(uuid),
  FOREIGN KEY (card_b_uuid) REFERENCES received_cards(uuid)
);

CREATE INDEX idx_candidates_pair ON cross_user_match_candidates(person_pair_key);
CREATE INDEX idx_candidates_card_a ON cross_user_match_candidates(card_a_uuid);
CREATE INDEX idx_candidates_card_b ON cross_user_match_candidates(card_b_uuid);
CREATE INDEX idx_candidates_confidence ON cross_user_match_candidates(match_confidence);
CREATE INDEX idx_candidates_validation ON cross_user_match_candidates(validation_status);
CREATE INDEX idx_candidates_detected ON cross_user_match_candidates(detected_at);

-- 2. 匹配黑名單 (防止重複處理)
CREATE TABLE matching_blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Canonicalized pair key
  person_pair_key TEXT NOT NULL UNIQUE,
  
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

---

## 核心實作

### 1. Pair Key 生成

```typescript
/**
 * 生成 canonicalized pair key (方向無關)
 */
export function generatePairKey(uuid1: string, uuid2: string): string {
  return [uuid1, uuid2].sort().join(':');
}

/**
 * 檢查黑名單
 */
export async function isBlacklisted(
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

### 2. 統一身份解析 (整合既有 dedup)

```typescript
/**
 * 統一身份解析
 * 整合既有 deduplicate-cards.ts 邏輯
 */
export async function resolveIdentity(
  env: Env,
  cardA: any,
  cardB: any
): Promise<{
  isSamePerson: boolean;
  confidence: number;
  method: string;
  evidence: Record<string, any>;
}> {
  
  // 1. Email 完全匹配 (最高優先級)
  if (cardA.email && cardA.email === cardB.email) {
    return {
      isSamePerson: true,
      confidence: 1.00,
      method: 'email_exact',
      evidence: { email_match: true, email: cardA.email }
    };
  }
  
  // 2. 電話完全匹配
  if (cardA.phone && cardA.phone === cardB.phone) {
    const normalized = normalizePhone(cardA.phone);
    return {
      isSamePerson: true,
      confidence: 0.95,
      method: 'phone_exact',
      evidence: { phone_match: true, phone_normalized: normalized }
    };
  }
  
  // 3. 字串相似度 + FileSearchStore 上下文
  // 重用既有 dedup 邏輯
  const { calculateStringSimilarity } = await import('../cron/deduplicate-cards');
  const stringSim = calculateStringSimilarity(cardA, cardB);
  
  if (stringSim.score >= 50 && stringSim.score <= 90) {
    // 灰色地帶：使用 FileSearchStore 增強
    const { checkPersonIdentity, checkCompanyRelationship } = await import('../cron/deduplicate-cards');
    
    const personResult = await checkPersonIdentity(env, cardA, cardB);
    const companyResult = await checkCompanyRelationship(
      env,
      cardA.organization || '',
      cardB.organization || ''
    );
    
    if (personResult.isSamePerson && companyResult.isSameCompany) {
      return {
        isSamePerson: true,
        confidence: Math.max(0.95, personResult.confidence / 100),
        method: 'context_match',
        evidence: {
          string_similarity: stringSim.score,
          person_match: personResult.reason,
          company_match: companyResult.reason,
          person_confidence: personResult.confidence
        }
      };
    }
    
    if (personResult.isSamePerson && personResult.confidence > 85) {
      return {
        isSamePerson: true,
        confidence: personResult.confidence / 100,
        method: 'context_match',
        evidence: {
          string_similarity: stringSim.score,
          person_match: personResult.reason,
          person_confidence: personResult.confidence
        }
      };
    }
  }
  
  return {
    isSamePerson: false,
    confidence: stringSim.score / 100,
    method: 'string_similarity',
    evidence: { string_similarity: stringSim.score }
  };
}

/**
 * 正規化電話號碼
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[-\s+()]/g, '');
}
```

### 3. Cron Job: 候選匹配

```typescript
/**
 * Cron Job: 跨使用者候選匹配
 * 每日 18:00 執行
 */
export async function findCrossUserCandidates(env: Env): Promise<{
  processed: number;
  candidates: number;
  skipped: number;
}> {
  const stats = { processed: 0, candidates: 0, skipped: 0 };
  const LOOKBACK_DAYS = 7;
  const cutoffTime = Date.now() - (LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  
  console.log('[Phase A] Starting cross-user candidate matching...');
  
  // 1. 取得最近更新的名片
  const recentCards = await env.DB.prepare(`
    SELECT uuid, user_email, full_name, organization, email, phone, created_at
    FROM received_cards
    WHERE updated_at > ?
      AND deleted_at IS NULL
      AND merged_to IS NULL
    ORDER BY updated_at DESC
    LIMIT 1000
  `).bind(cutoffTime).all();
  
  console.log(`[Phase A] Processing ${recentCards.results.length} recent cards`);
  
  // 2. 逐一處理
  for (const newCard of recentCards.results) {
    stats.processed++;
    
    try {
      // 3. 查找潛在匹配 (不同使用者)
      const candidates = await findPotentialMatches(env, newCard);
      
      for (const candidate of candidates) {
        // 4. 檢查黑名單
        if (await isBlacklisted(env, newCard.uuid, candidate.uuid)) {
          stats.skipped++;
          continue;
        }
        
        // 5. 檢查是否已存在候選
        const pairKey = generatePairKey(newCard.uuid, candidate.uuid);
        const existing = await env.DB.prepare(`
          SELECT 1 FROM cross_user_match_candidates
          WHERE person_pair_key = ?
          LIMIT 1
        `).bind(pairKey).first();
        
        if (existing) {
          stats.skipped++;
          continue;
        }
        
        // 6. 執行身份解析
        const identity = await resolveIdentity(env, newCard, candidate);
        
        if (!identity.isSamePerson || identity.confidence < 0.85) {
          continue;
        }
        
        // 7. 記錄候選
        await env.DB.prepare(`
          INSERT INTO cross_user_match_candidates (
            card_a_uuid, card_a_user, card_b_uuid, card_b_user,
            person_pair_key, match_confidence, match_method, match_evidence,
            detected_at, validation_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `).bind(
          newCard.uuid,
          newCard.user_email,
          candidate.uuid,
          candidate.user_email,
          pairKey,
          Math.round(identity.confidence * 100),
          identity.method,
          JSON.stringify(identity.evidence),
          Date.now()
        ).run();
        
        stats.candidates++;
        
        console.log(`[Phase A] Candidate: ${newCard.uuid} <-> ${candidate.uuid} (${identity.confidence.toFixed(2)})`);
      }
      
    } catch (error) {
      console.error(`[Phase A] Error processing card ${newCard.uuid}:`, error);
    }
  }
  
  console.log(`[Phase A] Complete:`, stats);
  return stats;
}

/**
 * 查找潛在匹配 (不同使用者)
 */
async function findPotentialMatches(
  env: Env,
  newCard: any
): Promise<any[]> {
  
  const matches: any[] = [];
  
  // 1. Email 匹配
  if (newCard.email) {
    const emailMatches = await env.DB.prepare(`
      SELECT uuid, user_email, full_name, organization, email, phone, created_at
      FROM received_cards
      WHERE email = ?
        AND user_email != ?
        AND deleted_at IS NULL
        AND merged_to IS NULL
      LIMIT 10
    `).bind(newCard.email, newCard.user_email).all();
    
    matches.push(...emailMatches.results);
  }
  
  // 2. 電話匹配
  if (newCard.phone && matches.length === 0) {
    const phoneNormalized = normalizePhone(newCard.phone);
    const phoneMatches = await env.DB.prepare(`
      SELECT uuid, user_email, full_name, organization, email, phone, created_at
      FROM received_cards
      WHERE replace(replace(replace(replace(phone, '-', ''), ' ', ''), '+', ''), '(', ''), ')', '') = ?
        AND user_email != ?
        AND deleted_at IS NULL
        AND merged_to IS NULL
      LIMIT 10
    `).bind(phoneNormalized, newCard.user_email).all();
    
    matches.push(...phoneMatches.results);
  }
  
  return matches;
}
```

### 4. 整合到 Cron Triggers

```typescript
// src/index.ts

// Cron trigger handler
if (request.url.endsWith('/cron')) {
  const cronType = new URL(request.url).searchParams.get('type');
  
  if (cronType === 'find-candidates') {
    // Phase A: 候選匹配
    const { findCrossUserCandidates } = await import('./cron/find-candidates');
    const result = await findCrossUserCandidates(env);
    
    return jsonResponse({
      success: true,
      message: 'Cross-user candidate matching complete',
      stats: result
    });
  }
  
  // ... 其他 cron jobs
}
```

---

## 量測 Precision

### 1. 驗證 API

```typescript
/**
 * POST /api/admin/validate-candidate
 * 管理員驗證候選匹配
 */
export async function handleValidateCandidate(
  request: Request,
  env: Env
): Promise<Response> {
  
  // 1. 驗證管理員權限
  const adminResult = await verifyAdmin(request, env);
  if (adminResult instanceof Response) return adminResult;
  
  // 2. 解析請求
  const body = await request.json() as {
    candidate_id: number;
    is_correct: boolean;
    notes?: string;
  };
  
  // 3. 更新驗證狀態
  await env.DB.prepare(`
    UPDATE cross_user_match_candidates
    SET validation_status = ?,
        validated_at = ?,
        validated_by = ?
    WHERE id = ?
  `).bind(
    body.is_correct ? 'confirmed' : 'rejected',
    Date.now(),
    'admin',
    body.candidate_id
  ).run();
  
  // 4. 若拒絕，加入黑名單
  if (!body.is_correct) {
    const candidate = await env.DB.prepare(`
      SELECT person_pair_key FROM cross_user_match_candidates WHERE id = ?
    `).bind(body.candidate_id).first();
    
    if (candidate) {
      await env.DB.prepare(`
        INSERT OR IGNORE INTO matching_blacklist (
          person_pair_key, reason, created_at, created_by, notes
        ) VALUES (?, 'manual_rejection', ?, 'admin', ?)
      `).bind(
        candidate.person_pair_key,
        Date.now(),
        body.notes || 'Manually rejected by admin'
      ).run();
    }
  }
  
  return jsonResponse({ success: true });
}
```

### 2. Precision 計算

```typescript
/**
 * GET /api/admin/candidate-precision
 * 計算候選匹配準確率
 */
export async function handleGetPrecision(
  request: Request,
  env: Env
): Promise<Response> {
  
  // 驗證管理員權限
  const adminResult = await verifyAdmin(request, env);
  if (adminResult instanceof Response) return adminResult;
  
  // 統計
  const stats = await env.DB.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN validation_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN validation_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN validation_status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM cross_user_match_candidates
  `).first();
  
  const validated = (stats.confirmed || 0) + (stats.rejected || 0);
  const precision = validated > 0 
    ? (stats.confirmed || 0) / validated 
    : 0;
  
  // 按信心度分組
  const byConfidence = await env.DB.prepare(`
    SELECT
      CASE
        WHEN match_confidence >= 95 THEN '95-100'
        WHEN match_confidence >= 90 THEN '90-95'
        WHEN match_confidence >= 85 THEN '85-90'
        ELSE 'other'
      END as confidence_range,
      COUNT(*) as total,
      SUM(CASE WHEN validation_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN validation_status = 'rejected' THEN 1 ELSE 0 END) as rejected
    FROM cross_user_match_candidates
    WHERE validation_status != 'pending'
    GROUP BY confidence_range
  `).all();
  
  return jsonResponse({
    overall: {
      total: stats.total,
      validated,
      pending: stats.pending,
      precision: precision.toFixed(3),
      precision_percent: (precision * 100).toFixed(1) + '%'
    },
    by_confidence: byConfidence.results
  });
}
```

---

## 實施時程

### Week 1: 核心實作

**Day 1-2**: 資料庫設計
- [ ] 撰寫 Migration 0036
- [ ] 本地測試 Migration
- [ ] 部署到 Staging

**Day 3-4**: 身份解析
- [ ] 實作 `generatePairKey()`
- [ ] 實作 `isBlacklisted()`
- [ ] 實作 `resolveIdentity()` (整合既有 dedup)
- [ ] 單元測試

**Day 5**: Cron Job
- [ ] 實作 `findCrossUserCandidates()`
- [ ] 實作 `findPotentialMatches()`
- [ ] 整合到 Cron Triggers

### Week 2: 驗證與量測

**Day 6-7**: 驗證 API
- [ ] 實作 `handleValidateCandidate()`
- [ ] 實作 `handleGetPrecision()`
- [ ] Admin UI (簡單版)

**Day 8-9**: 測試與調整
- [ ] 執行 Cron Job
- [ ] 人工驗證候選 (至少 50 筆)
- [ ] 計算 Precision
- [ ] 調整閾值

**Day 10**: 文檔與決策
- [ ] 撰寫 Precision 報告
- [ ] 決策: 是否進入 Phase B

---

## 驗收標準

- [ ] Migration 0036 部署成功
- [ ] Cron Job 正常執行
- [ ] 產生至少 50 個候選
- [ ] 人工驗證至少 50 筆
- [ ] **Precision > 90%** (關鍵指標)
- [ ] 無自動更新任何名片
- [ ] TypeScript 零錯誤

---

## 風險與緩解

| 風險 | 機率 | 影響 | 緩解措施 |
|------|------|------|---------|
| Precision < 90% | 中 | 高 | 調整閾值、優化演算法 |
| FileSearchStore API 限制 | 低 | 中 | 降級到純字串匹配 |
| 候選數量太少 | 低 | 中 | 擴大 lookback 天數 |
| 效能問題 | 低 | 低 | 批次處理、限制數量 |

---

## 下一步

**Phase A 完成後**:
- 若 Precision > 90%，進入 Phase B (低風險投影)
- 若 Precision < 90%，優化演算法後重測

---

**文檔結束**

**準備開始 Phase A 實施** 🚀
