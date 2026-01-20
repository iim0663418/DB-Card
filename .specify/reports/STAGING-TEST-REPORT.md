# User Self-Revoke Feature - Staging 測試報告
**Date**: 2026-01-20 00:08  
**Environment**: staging  
**URL**: https://db-card-staging.csw30454.workers.dev  
**Version**: 6ac241e6-61be-425a-ac14-4fdfd1bae04d

---

## ✅ 部署驗證

### 基礎設施
- ✅ Worker 部署成功
- ✅ D1 Database: db-card-staging (connected)
- ✅ KV Namespace: 87221de061f049d3a4c976b7b5092dd9
- ✅ Assets: 15 files (157.59 KiB)
- ✅ Cron: 0 2 * * * (daily cleanup)

### Health Check
```bash
curl https://db-card-staging.csw30454.workers.dev/health
```
**Response**:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "kek": "configured",
    "active_cards": 3
  }
}
```
✅ **Status**: PASS

---

## ✅ API 端點測試

### 1. POST /api/user/cards/:uuid/revoke

#### Test 1.1: 未認證請求
```bash
curl -X POST https://db-card-staging.csw30454.workers.dev/api/user/cards/550e8400-e29b-41d4-a716-446655440000/revoke \
  -H "Content-Type: application/json" \
  -d '{"reason":"lost"}'
```
**Expected**: 401 Unauthorized  
**Actual**:
```json
{
  "success": false,
  "error": {
    "code": "unauthorized",
    "message": "Missing or invalid authorization"
  }
}
```
✅ **Status**: PASS

---

### 2. POST /api/user/cards/:uuid/restore

#### Test 2.1: 未認證請求
```bash
curl -X POST https://db-card-staging.csw30454.workers.dev/api/user/cards/550e8400-e29b-41d4-a716-446655440000/restore
```
**Expected**: 401 Unauthorized  
**Actual**:
```json
{
  "success": false,
  "error": {
    "code": "unauthorized",
    "message": "Missing or invalid authorization"
  }
}
```
✅ **Status**: PASS

---

### 3. GET /api/user/revocation-history

#### Test 3.1: 未認證請求
```bash
curl https://db-card-staging.csw30454.workers.dev/api/user/revocation-history
```
**Expected**: 401 Unauthorized  
**Actual**:
```json
{
  "success": false,
  "error": {
    "code": "unauthorized",
    "message": "Missing or invalid authorization"
  }
}
```
✅ **Status**: PASS

---

## 📋 需要手動測試的功能

### 前端測試清單

訪問: https://db-card-staging.csw30454.workers.dev/user-portal.html

#### 1. 撤銷功能測試
- [ ] 登入 User Portal (Google OAuth)
- [ ] 選擇一張已綁定的名片
- [ ] 點擊「撤銷名片」按鈕
- [ ] 選擇撤銷原因（可選）
- [ ] 確認撤銷
- [ ] 驗證：
  - [ ] 名片狀態變為「已撤銷」
  - [ ] 顯示恢復期限（7 天）
  - [ ] 所有分享連結失效

#### 2. Rate Limiting 測試
- [ ] 在 1 小時內撤銷 3 次
- [ ] 第 4 次應顯示錯誤：「Revocation limit exceeded: 3 per hour」
- [ ] 驗證錯誤橫幅顯示重試時間

#### 3. 恢復功能測試
- [ ] 撤銷一張名片
- [ ] 點擊「恢復名片」按鈕
- [ ] 驗證名片狀態恢復為「已綁定」
- [ ] 驗證可以重新分享

#### 4. 7 天窗口測試
- [ ] 手動修改資料庫 `revoked_at` 為 8 天前
- [ ] 嘗試恢復
- [ ] 應顯示：「恢復期限已過，請聯繫管理員」

#### 5. 操作歷史測試
- [ ] 執行多次撤銷/恢復
- [ ] 檢查歷史記錄是否正確顯示
- [ ] 驗證包含：名稱、操作、原因、時間

---

## 🔍 資料庫驗證

### 檢查 revocation_rate_limits 表
```bash
wrangler d1 execute db-card-staging --env staging --remote \
  --command "SELECT * FROM revocation_rate_limits LIMIT 5;"
```

### 檢查 audit_logs
```bash
wrangler d1 execute db-card-staging --env staging --remote \
  --command "SELECT event_type, metadata, created_at FROM audit_logs WHERE event_type IN ('user_card_revoke', 'user_card_restore') ORDER BY created_at DESC LIMIT 10;"
```

### 檢查 uuid_bindings.revoked_at
```bash
wrangler d1 execute db-card-staging --env staging --remote \
  --command "SELECT uuid, status, revoked_at, revoke_reason FROM uuid_bindings WHERE revoked_at IS NOT NULL;"
```

---

## 📊 測試結果總結

### 自動化測試
| 測試項目 | 狀態 |
|---------|------|
| Health Check | ✅ PASS |
| Revoke API (未認證) | ✅ PASS |
| Restore API (未認證) | ✅ PASS |
| History API (未認證) | ✅ PASS |
| User Portal 可訪問 | ✅ PASS |

### 手動測試
| 測試項目 | 狀態 |
|---------|------|
| 撤銷功能 | ⏳ PENDING |
| Rate Limiting | ⏳ PENDING |
| 恢復功能 | ⏳ PENDING |
| 7 天窗口 | ⏳ PENDING |
| 操作歷史 | ⏳ PENDING |

---

## 🚀 下一步

1. **手動測試**：登入 User Portal 完成功能測試
2. **資料庫驗證**：檢查 audit_logs 和 rate_limits 表
3. **性能監控**：觀察 API 響應時間
4. **錯誤追蹤**：檢查 Cloudflare Dashboard 日誌

---

## 📝 已知問題

- 無

---

**測試人員**: Amazon Q Dev CLI  
**測試時間**: 2026-01-20 00:08 UTC+8
