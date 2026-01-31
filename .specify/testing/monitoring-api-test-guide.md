# 監控 API 測試指南

**部署環境**: Staging  
**Worker URL**: https://db-card-api.csw30454.workers.dev  
**Version ID**: 567dc16e-bdba-4ae7-8924-ad844bf17d94  
**部署時間**: 2026-01-28 11:36

---

## 🔑 前置準備

### 1. 獲取管理員 Token

```bash
# 方法 1: 使用瀏覽器登入 Admin Dashboard
# 打開: https://db-card-api.csw30454.workers.dev/admin-dashboard.html
# 登入後，從 DevTools > Application > Cookies 複製 admin_token

# 方法 2: 使用 SETUP_TOKEN 登入
curl -X POST https://db-card-api.csw30454.workers.dev/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_SETUP_TOKEN"}' \
  -c cookies.txt

# Token 會儲存在 cookies.txt
```

---

## 📊 API 測試

### 1. 測試健康檢查 API

```bash
# GET /api/admin/monitoring/health
curl -b cookies.txt \
  https://db-card-api.csw30454.workers.dev/api/admin/monitoring/health \
  | jq

# 預期回應:
# {
#   "status": "healthy",
#   "checks": {
#     "database": { "status": "ok", "latency": 12 },
#     "r2": { "status": "ok", "latency": 45 },
#     "kv": { "status": "ok", "latency": 3 }
#   },
#   "alerts": [],
#   "timestamp": 1738051200000
# }
```

**驗證點**:
- ✅ 返回 200 OK
- ✅ status = "healthy"
- ✅ 所有 checks.status = "ok"
- ✅ latency < 100ms

---

### 2. 測試系統總覽 API

```bash
# GET /api/admin/monitoring/overview
curl -b cookies.txt \
  https://db-card-api.csw30454.workers.dev/api/admin/monitoring/overview \
  | jq

# 預期回應:
# {
#   "upload": {
#     "total": 0,
#     "success": 0,
#     "failed": 0,
#     "success_rate": 100
#   },
#   "read": {
#     "total": 0,
#     "success": 0,
#     "failed": 0,
#     "success_rate": 100
#   },
#   "rate_limit": {
#     "upload_triggered": 0,
#     "read_triggered": 0,
#     "trigger_rate": 0
#   },
#   "errors": {
#     "total": 0,
#     "by_type": {}
#   },
#   "alerts": []
# }
```

**驗證點**:
- ✅ 返回 200 OK
- ✅ 初始數據為 0（尚無活動）
- ✅ success_rate = 100

---

### 3. 測試未授權請求

```bash
# 不帶 Cookie 請求
curl https://db-card-api.csw30454.workers.dev/api/admin/monitoring/health

# 預期回應:
# {"error":"Unauthorized"}
# HTTP 401
```

**驗證點**:
- ✅ 返回 401 Unauthorized
- ✅ 錯誤訊息正確

---

### 4. 觸發指標記錄（上傳 API）

```bash
# 上傳一張圖片（會自動記錄指標）
curl -X POST \
  -b cookies.txt \
  -F "card_uuid=test-card-001" \
  -F "asset_type=twin_front" \
  -F "file=@/path/to/test-image.jpg" \
  https://db-card-api.csw30454.workers.dev/api/admin/assets/upload

# 等待 5 秒（讓 KV 寫入完成）
sleep 5

# 再次查看 overview
curl -b cookies.txt \
  https://db-card-api.csw30454.workers.dev/api/admin/monitoring/overview \
  | jq '.upload'

# 預期回應:
# {
#   "total": 1,
#   "success": 1,
#   "failed": 0,
#   "success_rate": 100
# }
```

**驗證點**:
- ✅ upload.total = 1
- ✅ upload.success = 1
- ✅ success_rate = 100

---

### 5. 觸發失敗指標（超大檔案）

```bash
# 上傳超過 5 MB 的檔案（會失敗）
curl -X POST \
  -b cookies.txt \
  -F "card_uuid=test-card-001" \
  -F "asset_type=twin_front" \
  -F "file=@/path/to/large-file.jpg" \
  https://db-card-api.csw30454.workers.dev/api/admin/assets/upload

# 預期回應:
# {"error":"File size exceeds 5 MB limit"}
# HTTP 413

# 等待 5 秒
sleep 5

# 查看 overview
curl -b cookies.txt \
  https://db-card-api.csw30454.workers.dev/api/admin/monitoring/overview \
  | jq '.upload, .errors'

# 預期回應:
# {
#   "total": 2,
#   "success": 1,
#   "failed": 1,
#   "success_rate": 50
# }
# {
#   "total": 1,
#   "by_type": {
#     "file_too_large": 1
#   }
# }
```

**驗證點**:
- ✅ upload.failed = 1
- ✅ errors.by_type.file_too_large = 1
- ✅ success_rate = 50

---

### 6. 測試 Rate Limiting 觸發

```bash
# 快速連續上傳 11 次（觸發 Rate Limiting）
for i in {1..11}; do
  curl -X POST \
    -b cookies.txt \
    -F "card_uuid=test-card-001" \
    -F "asset_type=twin_front" \
    -F "file=@/path/to/test-image.jpg" \
    https://db-card-api.csw30454.workers.dev/api/admin/assets/upload
  echo "Upload $i"
done

# 第 11 次應該返回 429
# {"error":"Upload rate limit exceeded. Try again in 10 minutes"}

# 查看 overview
curl -b cookies.txt \
  https://db-card-api.csw30454.workers.dev/api/admin/monitoring/overview \
  | jq '.rate_limit'

# 預期回應:
# {
#   "upload_triggered": 1,
#   "read_triggered": 0,
#   "trigger_rate": 8.33
# }
```

**驗證點**:
- ✅ 第 11 次請求返回 429
- ✅ rate_limit.upload_triggered = 1

---

### 7. 測試快取機制

```bash
# 第一次請求（無快取）
time curl -b cookies.txt \
  https://db-card-api.csw30454.workers.dev/api/admin/monitoring/overview \
  > /dev/null

# 第二次請求（有快取，應該更快）
time curl -b cookies.txt \
  https://db-card-api.csw30454.workers.dev/api/admin/monitoring/overview \
  > /dev/null

# 等待 61 秒（快取過期）
sleep 61

# 第三次請求（快取過期，重新計算）
time curl -b cookies.txt \
  https://db-card-api.csw30454.workers.dev/api/admin/monitoring/overview \
  > /dev/null
```

**驗證點**:
- ✅ 第二次請求明顯更快
- ✅ 61 秒後快取過期

---

### 8. 測試告警觸發

```bash
# 製造大量失敗（觸發告警）
for i in {1..20}; do
  curl -X POST \
    -b cookies.txt \
    -F "card_uuid=test-card-001" \
    -F "asset_type=twin_front" \
    -F "file=@/path/to/large-file.jpg" \
    https://db-card-api.csw30454.workers.dev/api/admin/assets/upload
done

# 等待 5 秒
sleep 5

# 查看 overview（應該有告警）
curl -b cookies.txt \
  https://db-card-api.csw30454.workers.dev/api/admin/monitoring/overview \
  | jq '.alerts'

# 預期回應:
# [
#   {
#     "level": "critical",
#     "message": "Upload success rate critically low: 4.76%",
#     "metric": "upload_success_rate",
#     "value": 4.76,
#     "threshold": 90,
#     "timestamp": "2026-01-28T11:40:00Z"
#   }
# ]

# 查看 health（應該是 unhealthy）
curl -b cookies.txt \
  https://db-card-api.csw30454.workers.dev/api/admin/monitoring/health \
  | jq '.status'

# 預期回應: "unhealthy"
```

**驗證點**:
- ✅ alerts 包含 critical 告警
- ✅ health.status = "unhealthy"

---

## 🧪 完整測試腳本

```bash
#!/bin/bash

BASE_URL="https://db-card-api.csw30454.workers.dev"
COOKIE_FILE="cookies.txt"

echo "=== 監控 API 測試 ==="

# 1. 健康檢查
echo -e "\n1. 測試健康檢查..."
curl -s -b $COOKIE_FILE $BASE_URL/api/admin/monitoring/health | jq '.status'

# 2. 系統總覽
echo -e "\n2. 測試系統總覽..."
curl -s -b $COOKIE_FILE $BASE_URL/api/admin/monitoring/overview | jq '.upload, .read'

# 3. 未授權請求
echo -e "\n3. 測試未授權請求..."
curl -s $BASE_URL/api/admin/monitoring/health | jq '.error'

echo -e "\n=== 測試完成 ==="
```

---

## 📝 測試檢查清單

### 基本功能
- [ ] GET /api/admin/monitoring/health 返回 200
- [ ] GET /api/admin/monitoring/overview 返回 200
- [ ] 未授權請求返回 401

### 指標記錄
- [ ] 上傳成功後 upload.success 遞增
- [ ] 上傳失敗後 upload.failed 遞增
- [ ] 錯誤類型正確記錄
- [ ] Rate Limiting 觸發正確記錄

### 快取機制
- [ ] overview 快取 60 秒生效
- [ ] health 快取 30 秒生效
- [ ] 快取過期後重新計算

### 告警機制
- [ ] 成功率 < 90% 觸發 critical 告警
- [ ] 成功率 < 95% 觸發 warning 告警
- [ ] health.status 正確反映系統狀態

### 效能
- [ ] API 回應時間 < 200ms（無快取）
- [ ] API 回應時間 < 50ms（有快取）
- [ ] KV 寫入不阻塞主流程

---

## 🐛 常見問題

### Q: 返回 401 Unauthorized
**A**: 檢查 Cookie 是否正確設定
```bash
# 重新登入
curl -X POST $BASE_URL/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_SETUP_TOKEN"}' \
  -c cookies.txt
```

### Q: 指標沒有更新
**A**: 等待 5-10 秒讓 KV 寫入完成
```bash
sleep 10
```

### Q: 快取沒有生效
**A**: 檢查 KV 是否正常
```bash
curl -b cookies.txt $BASE_URL/api/admin/monitoring/health | jq '.checks.kv'
```

---

**測試環境**: Staging  
**部署版本**: 567dc16e-bdba-4ae7-8924-ad844bf17d94  
**測試日期**: 2026-01-28
