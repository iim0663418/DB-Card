# Security Triage Report — DB-Card

> Generated: 2026-06-16 | Pipeline: threat-model → security-audit → security-triage

## Summary

| Verdict | Count |
|---------|-------|
| TRUE_POSITIVE | 10 |
| FALSE_POSITIVE | 3 |
| CANNOT_VERIFY | 1 |
| DUPLICATE | 0 |
| **Total** | **15** (original) → **14** (candidates) |

| Severity | Count (TP only) |
|----------|-------|
| CRITICAL | 1 |
| HIGH | 2 |
| MEDIUM | 2 |
| LOW | 5 |

---

## 🔴 CRITICAL

### f001 — trigger-cron 完全無認證
- **File:** `handlers/admin/trigger-cron.ts`
- **Verdict:** TRUE_POSITIVE (confidence: 0.95)
- **Evidence:** handler 內無 `verifySetupToken` 呼叫，index.ts 路由亦無 middleware guard。同目錄其他 handler（cards/security/monitoring/kek-status）都有，此處遺漏。
- **Impact:** 任何人可 POST `/api/admin/trigger-cron` 觸發全部 cron 任務（auto-tag、find-candidates、sync-embeddings、deduplicate、cleanup）
- **Preconditions:** 0 | Access: unauthenticated_remote → CRITICAL

---

## 🟠 HIGH

### f002 — test-batch-api 無認證
- **File:** `handlers/admin/test-batch-api.ts`
- **Verdict:** TRUE_POSITIVE (confidence: 0.90)
- **Evidence:** handler 不驗證 Authorization header。註解建議帶 token 但不強制。
- **Impact:** 觸發 batch migration test，可能影響資料完整性

### f003 — candidates endpoints 無認證
- **File:** `handlers/admin/candidates.ts`
- **Verdict:** TRUE_POSITIVE (confidence: 0.95)
- **Evidence:** GET /candidates、GET /precision、PUT /:pairKey 三端點完全無 auth。
- **Impact:** 列出全系統跨使用者匹配候選 + 修改匹配狀態

---

## 🟡 MEDIUM

### f004 — shared-cards 缺少 user scope 過濾
- **Verdict:** TRUE_POSITIVE (confidence: 0.75) | 需進一步確認 SQL WHERE 條件

### f007 — HS256 JWT user/MCP 共用 secret
- **Verdict:** TRUE_POSITIVE (confidence: 0.60) | 需 secret 洩漏為前提

---

## 🟢 LOW (5 筆)

| ID | Title | Confidence |
|----|-------|-----------|
| f005 | CSRF middleware 無 cookie 時放行 | 0.70 |
| f006 | MCP registration 無 TTL | 0.65 |
| f008 | NFC UUID oracle | 0.55 |
| f012 | Rate limit race condition | 0.50 |
| f013 | RISC replay | 0.55 |
| f015 | Filename 未驗證 | 0.50 |

---

## ❌ FALSE POSITIVE (3 筆)

| ID | Title | Exclusion Rule | Reason |
|----|-------|---------------|--------|
| f010 | OAuth redirect 暴露 session | #15 非敏感資訊 | state 參數是 CSRF protection，非 session |
| f011 | Shared cards 設計疑慮 | #12 設計 open endpoint | 分享名片是功能設計 |
| f014 | MCP token auth bypass | #12 設計 open endpoint | OAuth client_credentials flow 本就不需 user auth |

---

## ⚪ CANNOT_VERIFY (1 筆)

| ID | Title | Reason |
|----|-------|--------|
| f009 | Read session 無 client binding | 需 runtime 測試確認 session token 傳輸機制 |

---

## Recommended Fix Priority

1. **f001** (CRITICAL) — 加 `verifySetupToken` 到 trigger-cron handler（5 分鐘修復）
2. **f003** (HIGH) — 加 auth 到 candidates 三個端點
3. **f002** (HIGH) — 加 auth 到 test-batch-api（或從生產移除）
4. **f004** (MEDIUM) — 確認 SQL query 是否正確 scope
5. **f007** (MEDIUM) — 分離 user JWT 和 MCP JWT 的 signing key
