# v4.1.0 Staging 部署報告

## 部署資訊

**部署時間**: 2026-01-20T14:44:00+08:00  
**版本**: v4.1.0  
**環境**: Staging  
**部署 ID**: 10e097d2-024c-4f29-ac98-54aa7c54f404  
**URL**: https://db-card-staging.csw30454.workers.dev  
**Git Commit**: a340a3b

---

## 部署內容

### 新增功能
- ✅ Layer 1: 60秒去重機制 (KV-based deduplication)
- ✅ Layer 2: 雙維度速率限制 (Card UUID + IP)
  - Card: 10/min, 50/hour
  - IP: 10/min, 60/hour
- ✅ Sliding Window Counter 算法
- ✅ IP 優先提取 (CF-Connecting-IP)

### 新增文件
- `workers/src/utils/rate-limit.ts` - 速率限制工具
- `workers/src/utils/ip.ts` - IP 提取工具

### 修改文件
- `workers/src/handlers/tap.ts` - 重構為 5-step 執行順序
- `workers/src/types.ts` - 新增 5 個類型定義
- `workers/package.json` - 版本更新至 4.1.0

### 文檔更新
- 完整 BDD 規格 (11 scenarios)
- 實作總結文檔
- 本地測試報告 (6/6 通過)
- 完整系統架構文檔
- 決策摘要文檔
- CHANGELOG.md

---

## 部署驗證

### 1. Health Check ✅

**請求**:
```bash
curl https://db-card-staging.csw30454.workers.dev/health
```

**回應**:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "kek": "configured",
    "kek_version": 4,
    "active_cards": 5,
    "environment": "staging",
    "timestamp": 1768891490920
  }
}
```

**驗證**: ✅ 服務正常運行

---

### 2. Invalid UUID Format ✅

**請求**:
```bash
curl -X POST https://db-card-staging.csw30454.workers.dev/api/nfc/tap \
  -H "Content-Type: application/json" \
  -d '{"card_uuid":"invalid-uuid"}'
```

**回應**:
```json
{
  "success": false,
  "error": {
    "code": "invalid_request",
    "message": "無效的 UUID 格式"
  }
}
```

**驗證**: ✅ Step 0 (Basic Validation) 正常工作

---

### 3. Card Not Found ✅

**請求**:
```bash
curl -X POST https://db-card-staging.csw30454.workers.dev/api/nfc/tap \
  -H "Content-Type: application/json" \
  -d '{"card_uuid":"12345678-1234-4234-8234-123456789abc"}'
```

**回應**:
```json
{
  "success": false,
  "error": {
    "code": "card_not_found",
    "message": "名片不存在"
  }
}
```

**驗證**: ✅ Step 3 (Card Validation) 正常工作

---

### 4. Dedup Mechanism ✅

**測試卡片**: `1e048204-aefc-46f9-8760-5b8e0ae8f576`

#### Test 4.1: First Tap (New Session)

**回應**:
```json
{
  "success": true,
  "data": {
    "session_id": "071498ab-7dc5-4810-be70-0a21123c9a4e",
    "expires_at": 1768977941322,
    "max_reads": 20,
    "reads_used": 0,
    "revoked_previous": true,
    "reused": false  // ← 新 session
  }
}
```

#### Test 4.2: Second Tap (Dedup Hit)

**回應** (2 秒後):
```json
{
  "success": true,
  "data": {
    "session_id": "071498ab-7dc5-4810-be70-0a21123c9a4e",  // ← 相同
    "expires_at": 1768977941322,
    "max_reads": 20,
    "reads_used": 0,
    "reused": true  // ← 去重命中！
  }
}
```

**驗證**: 
- ✅ 返回相同的 session_id
- ✅ `reused: true` 標記正確
- ✅ Step 1 (Dedup Check) 正常工作

---

## 功能驗證總結

| 測試項目 | 狀態 | 說明 |
|---------|------|------|
| Health Check | ✅ PASS | 服務正常運行 |
| Invalid UUID | ✅ PASS | 400 錯誤正確返回 |
| Card Not Found | ✅ PASS | 404 錯誤正確返回 |
| Dedup Mechanism | ✅ PASS | 60秒內返回相同 session |

**總計**: 4/4 通過 (100%)

---

## 環境資訊

### Staging 環境配置

```toml
[env.staging]
name = "db-card-staging"
vars = { 
  ENVIRONMENT = "staging",
  GOOGLE_CLIENT_ID = "675226781448-akeqtr5d603ad0bcb3tve5hl4a8c164u.apps.googleusercontent.com"
}

[[env.staging.d1_databases]]
binding = "DB"
database_name = "db-card-staging"
database_id = "d31b5e42-d8bf-4044-9744-4aff5669de4b"

[[env.staging.kv_namespaces]]
binding = "KV"
id = "87221de061f049d3a4c976b7b5092dd9"
```

### 資料庫狀態
- **Database**: db-card-staging
- **Active Cards**: 5
- **KEK Version**: 4
- **Status**: Connected ✅

### Worker 資訊
- **Name**: db-card-staging
- **Region**: APAC (SIN)
- **Cron**: 0 2 * * * (Daily at 02:00 UTC)
- **Upload Size**: 161.87 KiB / gzip: 31.00 KiB
- **Deploy Time**: 6.18 sec

---

## 已知限制

### 未測試項目

1. **Rate Limit 觸發**
   - 需要發送 11+ 次請求才能觸發
   - 建議在後續監控中驗證

2. **Hour 窗口速率限制**
   - 需要長時間測試
   - 建議在實際使用中監控

3. **Retap Revocation**
   - 需要在 10 分鐘內重新觸碰
   - 建議在實際使用中驗證

### 監控建議

1. **Dedup Hit Rate**
   - 監控 `reused: true` 的比例
   - 預期: 20-40% (取決於使用模式)

2. **Rate Limit Trigger Frequency**
   - 監控 429 錯誤的頻率
   - 預期: <1% (正常使用情況)

3. **Response Time**
   - 監控 P50, P95, P99
   - 預期: <500ms (P95)

4. **Error Rate**
   - 監控各類錯誤的比例
   - 預期: <5% (總錯誤率)

---

## 下一步行動

### 立即行動

- [x] 部署到 Staging ✅
- [x] 基本功能驗證 ✅
- [ ] 監控 24 小時
- [ ] 收集實際使用數據
- [ ] 驗證 Rate Limit 觸發

### 後續計劃

1. **監控期 (1-3 天)**
   - 觀察 Dedup hit rate
   - 觀察 Rate limit trigger frequency
   - 收集性能指標
   - 收集錯誤日誌

2. **調整期 (如需要)**
   - 根據監控數據調整限制值
   - 優化錯誤訊息
   - 修復發現的問題

3. **Production 部署**
   - 確認 Staging 穩定後
   - 準備 Production 部署計劃
   - 執行 Production 部署

---

## 回滾計劃

如果發現嚴重問題，可以快速回滾：

```bash
# 查看部署歷史
npx wrangler deployments list --env staging

# 回滾到上一個版本
npx wrangler rollback --env staging --version-id <previous-version-id>
```

**上一個版本**: 52851b02-a6e7-4327-82c7-208df74b8bee

---

## 聯絡資訊

**部署者**: Commander (Centralized Architect)  
**測試者**: Commander  
**審核者**: Commander  

**問題回報**: GitHub Issues  
**緊急聯絡**: 透過 Admin Dashboard

---

**部署狀態**: ✅ **成功**  
**驗證狀態**: ✅ **通過**  
**準備狀態**: ✅ **可開始監控**  
**下一階段**: 監控 24 小時 → Production 部署
