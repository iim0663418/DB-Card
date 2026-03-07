# 生產環境 500 錯誤修復指南

## 問題診斷

**時間**: 2026-03-07 22:08
**環境**: Production (db-card.sfan-tech.com)
**錯誤**: GET /api/user/received-cards 500 (Internal Server Error)

## 根本原因

**Cloudflare Bot Management 擋住了 API 請求**

### 證據
```bash
curl -s "https://db-card.sfan-tech.com/health"
# 回應：Cloudflare Challenge 頁面（JavaScript Challenge）
```

### 影響範圍
- ❌ 所有 API 端點無法訪問
- ❌ 前端 AJAX 請求失敗
- ✅ 靜態頁面可以訪問（通過 Challenge 後）

---

## 修復步驟

### 方案 A: 關閉 Bot Fight Mode（推薦）

1. 登入 Cloudflare Dashboard
2. 選擇 `sfan-tech.com` zone
3. 進入 **Security** > **Bots**
4. 關閉 **Bot Fight Mode**
5. 等待 1-2 分鐘生效

**優點**: 立即修復
**缺點**: 失去 Bot 防護

---

### 方案 B: 設定 WAF 規則排除 API（推薦）

1. 登入 Cloudflare Dashboard
2. 選擇 `sfan-tech.com` zone
3. 進入 **Security** > **WAF** > **Custom rules**
4. 點擊 **Create rule**
5. 設定規則：

**Rule name**: `Allow API Requests`

**Expression**:
```
(http.host eq "db-card.sfan-tech.com" and starts_with(http.request.uri.path, "/api/"))
```

**Action**: `Skip` > `All remaining custom rules`

**Order**: 1 (最高優先級)

6. 點擊 **Deploy**

**優點**: 保留 Bot 防護，只開放 API
**缺點**: 需要設定規則

---

### 方案 C: 設定 Page Rules（簡單）

1. 登入 Cloudflare Dashboard
2. 選擇 `sfan-tech.com` zone
3. 進入 **Rules** > **Page Rules**
4. 點擊 **Create Page Rule**
5. 設定：

**URL**: `db-card.sfan-tech.com/api/*`

**Settings**:
- Security Level: `Essentially Off`
- Browser Integrity Check: `Off`

6. 點擊 **Save and Deploy**

**優點**: 最簡單
**缺點**: Page Rules 有數量限制（免費版 3 個）

---

## 驗證修復

```bash
# 測試 health endpoint
curl -s "https://db-card.sfan-tech.com/health" | jq -r '.status'
# 預期：ok

# 測試 API endpoint（需要認證）
curl -sI "https://db-card.sfan-tech.com/api/user/received-cards"
# 預期：401 Unauthorized（不是 Cloudflare Challenge）
```

---

## 預防措施

### 1. 監控設定
- 定期檢查 Cloudflare Security 設定
- 避免啟用過於嚴格的 Bot 防護

### 2. 測試流程
- 部署後測試生產環境 API
- 使用 curl 測試（模擬非瀏覽器請求）

### 3. 文檔記錄
- 記錄所有 Cloudflare 設定變更
- 維護 WAF 規則清單

---

## 建議方案

**使用方案 B（WAF 規則）**

### 理由
1. 保留 Bot 防護（保護前端頁面）
2. 開放 API 訪問（允許合法請求）
3. 精確控制（只影響 /api/* 路徑）
4. 可擴展（未來可加入更多規則）

### WAF 規則範例

```
Rule 1: Allow API Requests
- Expression: (http.host eq "db-card.sfan-tech.com" and starts_with(http.request.uri.path, "/api/"))
- Action: Skip > All remaining custom rules
- Order: 1

Rule 2: Allow Health Check
- Expression: (http.host eq "db-card.sfan-tech.com" and http.request.uri.path eq "/health")
- Action: Skip > All remaining custom rules
- Order: 2

Rule 3: Allow OAuth Callback
- Expression: (http.host eq "db-card.sfan-tech.com" and http.request.uri.path eq "/oauth/callback")
- Action: Skip > All remaining custom rules
- Order: 3
```

---

## 時間線

- **22:08**: 用戶回報 500 錯誤
- **22:09**: 診斷為 Cloudflare Challenge
- **22:10**: 提供修復方案
- **待執行**: Cloudflare Dashboard 設定

---

## 相關文檔

- Cloudflare Bot Management: https://developers.cloudflare.com/bots/
- WAF Custom Rules: https://developers.cloudflare.com/waf/custom-rules/
- Page Rules: https://developers.cloudflare.com/rules/page-rules/

---

**修復責任**: Cloudflare Dashboard 管理員
**預估時間**: 5-10 分鐘
**影響**: 修復後立即恢復服務
