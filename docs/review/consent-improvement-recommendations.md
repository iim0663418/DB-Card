# 個資同意管理系統 - 改進建議（基於外部資訊）

**參考來源**: Cloudflare D1 官方文檔  
**日期**: 2026-02-02

## 📊 優先級建議

| 改進項目 | 優先級 | 工作量 | 效益 | 建議 |
|---------|--------|--------|------|------|
| 1. 使用 batch() | 🔴 高 | 30 分鐘 | 高 | ✅ 立即實作 |
| 2. 定義常數 | 🟡 中 | 15 分鐘 | 中 | ✅ 建議實作 |
| 3. 代碼重構 | 🟢 低 | 1 小時 | 低 | ❌ 暫不實作 |

## 1️⃣ 使用 DB.batch() - 交易處理

### 官方文檔說明

根據 Cloudflare D1 官方文檔：

> **Batched statements are SQL transactions**. If a statement in the sequence fails, then an error is returned for that specific statement, and it aborts or rolls back the entire sequence.

**來源**: https://developers.cloudflare.com/d1/worker-api/d1-database/#batch

### 建議改進

#### 當前實作（有風險）
```typescript
// Line 287-310 in consent.ts
await env.DB.prepare(`UPDATE consent_records...`).run();
await env.DB.prepare(`UPDATE uuid_bindings...`).run();
await env.DB.prepare(`UPDATE read_sessions...`).run();
```

**問題**: 若第二或第三個語句失敗，第一個已經 commit，導致資料不一致

#### 建議改進（原子性）
```typescript
await env.DB.batch([
  env.DB.prepare(`UPDATE consent_records...`).bind(...),
  env.DB.prepare(`UPDATE uuid_bindings...`).bind(...),
  env.DB.prepare(`UPDATE read_sessions...`).bind(...)
]);
```

**優點**:
- ✅ 原子性：全部成功或全部回滾
- ✅ 效能：單次網路請求
- ✅ 一致性：避免部分更新

### 適用位置

1. ✅ `handleConsentWithdraw` (Line 287-310) - 3 個 UPDATE
2. ✅ `handleConsentRestore` (Line 370-385) - 2 個 UPDATE

---

## 2️⃣ 定義常數 - 消除魔術數字

### 當前問題

```typescript
const deletionScheduled = now + (30 * 24 * 60 * 60 * 1000); // 30 days
const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
```

### 建議改進

```typescript
// 檔案頂部定義
const WITHDRAWAL_GRACE_PERIOD_DAYS = 30;
const AUDIT_LOG_RETENTION_DAYS = 90;
const daysToMs = (days: number) => days * 24 * 60 * 60 * 1000;

// 使用常數
const deletionScheduled = now + daysToMs(WITHDRAWAL_GRACE_PERIOD_DAYS);
const retentionCutoff = Date.now() - daysToMs(AUDIT_LOG_RETENTION_DAYS);
```

**優點**:
- ✅ 可讀性提升
- ✅ 集中管理
- ✅ 避免錯誤

---

## 3️⃣ 代碼重構 - 暫不建議

### 評估結論

**當前實作已足夠好，不建議重構**

**原因**:
1. TypeScript Decorator 需要額外配置
2. Cloudflare Workers 環境限制
3. 增加複雜度但收益有限
4. 當前 OAuth 驗證邏輯清晰易懂

---

## 🎯 實作計畫

**總工作量**: 45 分鐘  
**風險等級**: 低（官方推薦做法）

### Phase 1: 使用 batch() (30 分鐘)
- 修改 `handleConsentWithdraw`
- 修改 `handleConsentRestore`

### Phase 2: 定義常數 (15 分鐘)
- 檔案頂部定義常數
- 替換所有魔術數字

---

## 📚 參考資料

1. **Cloudflare D1 Batch Operations**  
   https://developers.cloudflare.com/d1/worker-api/d1-database/#batch

2. **SQLite Transactions**  
   https://www.sqlite.org/lang_transaction.html

---

**建議**: 立即實作 Phase 1 + Phase 2，預期 45 分鐘完成。
