# User Self-Revoke Feature - 部署檢查清單

## 1️⃣ 執行 Database Migrations

```bash
# 本地測試
wrangler d1 migrations apply DB --local

# 生產環境
wrangler d1 migrations apply DB --remote
```

## 2️⃣ 驗證 Migration 結果

```bash
# 檢查表結構
wrangler d1 execute DB --remote --command "SELECT sql FROM sqlite_master WHERE name='revocation_rate_limits';"
wrangler d1 execute DB --remote --command "PRAGMA table_info(uuid_bindings);"
```

## 3️⃣ 部署代碼

```bash
# Staging
npm run deploy:staging

# Production
npm run deploy:production
```

## 4️⃣ 功能驗證

### 測試撤銷功能
1. 登入 user-portal
2. 選擇一張已綁定的名片
3. 點擊「撤銷名片」
4. 選擇撤銷原因（可選）
5. 確認撤銷
6. 驗證：
   - 名片狀態變為「已撤銷」
   - 顯示恢復期限
   - 所有 sessions 失效

### 測試 Rate Limiting
1. 連續撤銷 3 次（1 小時內）
2. 第 4 次應顯示錯誤：「Revocation limit exceeded: 3 per hour」
3. 驗證錯誤橫幅顯示重試時間

### 測試恢復功能
1. 撤銷一張名片
2. 點擊「恢復名片」
3. 驗證名片狀態恢復為「已綁定」

### 測試 7 天窗口
1. 手動修改 `revoked_at` 為 8 天前
2. 嘗試恢復
3. 應顯示：「恢復期限已過，請聯繫管理員」

### 測試操作歷史
1. 執行多次撤銷/恢復
2. 檢查歷史記錄是否正確顯示

## 5️⃣ 審計日誌檢查

```bash
# 查詢撤銷事件
wrangler d1 execute DB --remote --command "
SELECT event_type, metadata, created_at 
FROM audit_logs 
WHERE event_type IN ('user_card_revoke', 'user_card_restore') 
ORDER BY created_at DESC 
LIMIT 10;
"
```

## 6️⃣ 性能監控

- API 響應時間應 < 500ms
- Rate limit 查詢應 < 100ms
- Session 撤銷應批次執行

## 7️⃣ 已知限制

- Rate limit 使用 D1 表追蹤（非 KV），可能有輕微延遲
- 7 天窗口基於 `revoked_at` 時間戳，需確保伺服器時間同步
- 撤銷歷史僅保留 30 天

## 8️⃣ 回滾計畫

如需回滾：
```bash
# 1. 回滾代碼
git revert <commit_hash>
npm run deploy

# 2. 保留 migrations（不建議回滾資料庫）
# revocation_rate_limits 表不影響現有功能
# revoked_at 欄位可為 NULL
```

