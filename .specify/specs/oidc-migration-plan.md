# OIDC 遷移實作計畫

## 總覽
**目標**: 從 OAuth 2.0 遷移到完整 OIDC 合規  
**總工期**: 5-7 天  
**當前進度**: 60% (已有 openid scope + Authorization Code Flow + State)

---

## Phase 1: 核心 OIDC (P0) - 3 天

### 目標
實作 ID Token 驗證與 JWKS 管理

### 工作項目
1. **Day 1: JWKS 管理** (6-8 小時)
   - [ ] 實作 `jwks-manager.ts`
   - [ ] JWKS 快取機制 (KV, TTL 3600s)
   - [ ] JWKS 自動更新
   - [ ] 降級處理 (快取失效時)
   - [ ] 單元測試

2. **Day 2: ID Token 驗證** (6-8 小時)
   - [ ] 實作 `oidc-validator.ts`
   - [ ] ID Token 驗證 (iss/aud/exp/iat/sub)
   - [ ] JWKS 簽章驗證
   - [ ] Clock skew 容忍 (±60s)
   - [ ] 單元測試

3. **Day 3: 整合與測試** (6-8 小時)
   - [ ] 修改 `oauth.ts` 使用 ID Token
   - [ ] 向後相容處理 (降級到 UserInfo API)
   - [ ] 整合測試
   - [ ] 安全測試
   - [ ] 修復 bugs

### 交付物
- ✅ `workers/src/utils/jwks-manager.ts`
- ✅ `workers/src/utils/oidc-validator.ts`
- ✅ 修改 `workers/src/handlers/oauth.ts`
- ✅ 11 個 BDD scenarios 通過
- ✅ 文檔更新

### 成功標準
- ✅ ID Token 驗證正常運作
- ✅ JWKS 快取正常運作
- ✅ 向後相容不破壞現有流程
- ✅ 所有測試通過

---

## Phase 2: 安全強化 (P1) - 2 天

### 目標
實作 Nonce 防重放與 Discovery Endpoint

### 工作項目
1. **Day 4: Nonce 實作** (4 小時)
   - [ ] 前端生成 nonce (類似 state)
   - [ ] 後端驗證 nonce (KV, TTL 600s)
   - [ ] 一次性使用 (驗證後刪除)
   - [ ] 整合到 ID Token 驗證
   - [ ] 測試

2. **Day 5: Discovery Endpoint** (4 小時)
   - [ ] 實作 `oidc-discovery.ts`
   - [ ] 快取 discovery config (KV, TTL 86400s)
   - [ ] 動態取得 token_endpoint, jwks_uri, userinfo_endpoint
   - [ ] 移除硬編碼端點
   - [ ] 測試

### 交付物
- ✅ Nonce 防重放機制
- ✅ Discovery Endpoint 支援
- ✅ 移除硬編碼端點

### 成功標準
- ✅ Nonce 驗證正常運作
- ✅ Discovery 自動取得端點
- ✅ 所有測試通過

---

## Phase 3: 最佳化 (P2) - 1 天

### 目標
改用 sub 作為使用者主鍵與最佳化

### 工作項目
1. **Day 6: Sub 主鍵遷移** (4 小時)
   - [ ] 資料庫 schema 更新 (新增 sub 欄位)
   - [ ] 遷移腳本 (email -> sub mapping)
   - [ ] 改用 sub 作為使用者識別
   - [ ] 向後相容處理
   - [ ] 測試

2. **Day 7: 最佳化與文檔** (4 小時)
   - [ ] JWKS 快取更新策略優化
   - [ ] Clock skew 容忍調整
   - [ ] Token revoke 流程
   - [ ] 完整文檔更新
   - [ ] 部署指南

### 交付物
- ✅ Sub 作為主鍵
- ✅ 最佳化快取策略
- ✅ 完整文檔

### 成功標準
- ✅ Sub 主鍵正常運作
- ✅ 效能無退化
- ✅ 文檔完整

---

## 風險管理

### 高風險項目
1. **JWKS 公鑰驗證失敗**
   - 風險: Google JWKS endpoint 無法連線
   - 緩解: 快取降級處理 + 監控告警

2. **ID Token 缺少必要 claims**
   - 風險: Google 回傳的 ID Token 格式變更
   - 緩解: 向後相容降級到 UserInfo API

3. **時鐘偏移導致驗證失敗**
   - 風險: 伺服器時鐘不同步
   - 緩解: Clock skew 容忍 ±60s

### 中風險項目
1. **JWKS 快取過期處理**
   - 風險: 快取過期時效能下降
   - 緩解: 背景更新 + 延長 TTL

2. **Nonce 狀態管理**
   - 風險: KV 寫入失敗
   - 緩解: 錯誤處理 + 重試機制

---

## 測試策略

### 單元測試 (每個 Phase)
- ✅ 所有新增函數
- ✅ 邊界條件
- ✅ 錯誤處理

### 整合測試 (Phase 1 & 2)
- ✅ 完整 OAuth 流程
- ✅ JWKS 快取機制
- ✅ Nonce 驗證
- ✅ Discovery 端點

### 安全測試 (Phase 1 & 2)
- ✅ 竄改 ID Token
- ✅ 過期 Token
- ✅ 錯誤 audience/issuer
- ✅ Nonce 重放攻擊

### 效能測試 (Phase 3)
- ✅ JWKS 快取命中率
- ✅ ID Token 驗證延遲
- ✅ 並發登入測試

---

## 部署計畫

### Staging 部署 (每個 Phase 完成後)
1. 部署到 staging 環境
2. 執行完整測試
3. 監控 24 小時
4. 修復問題

### Production 部署 (Phase 3 完成後)
1. 準備 rollback 計畫
2. 灰度發布 (10% -> 50% -> 100%)
3. 監控關鍵指標
4. 完整驗證

---

## 監控指標

### 關鍵指標
- ✅ ID Token 驗證成功率
- ✅ JWKS 快取命中率
- ✅ OAuth 登入成功率
- ✅ 平均登入延遲

### 告警閾值
- ❌ ID Token 驗證失敗率 > 1%
- ❌ JWKS 快取命中率 < 95%
- ❌ 登入成功率 < 99%
- ❌ 登入延遲 > 2 秒

---

## Rollback 計畫

### 觸發條件
- ❌ 登入成功率 < 95%
- ❌ 嚴重安全漏洞
- ❌ 效能退化 > 50%

### Rollback 步驟
1. 切換到上一個穩定版本
2. 驗證功能正常
3. 分析失敗原因
4. 修復後重新部署

---

## 下一步行動

### 立即執行 (今天)
- [x] 撰寫 Phase 1 BDD 規格 ✅
- [x] 撰寫實作計畫 ✅
- [ ] 準備開發環境
- [ ] 開始實作 JWKS Manager

### 本週完成
- [ ] Phase 1 完整實作
- [ ] Phase 1 測試通過
- [ ] Staging 部署驗證

### 下週完成
- [ ] Phase 2 & 3 實作
- [ ] Production 部署
- [ ] 文檔更新

---

**計畫完成，準備開始實作 Phase 1** 🚀
