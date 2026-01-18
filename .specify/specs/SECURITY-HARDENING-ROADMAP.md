# 安全強化路線圖

## 概述
針對錯誤訊息資訊洩露風險的系統性強化計劃

## 優先級分類

### P0 - 立即執行（本週）
1. **統一公開錯誤回應**
   - 移除詳細錯誤代碼和訊息
   - 實作 `publicErrorResponse()`
   - 影響範圍：所有公開 API

2. **404 端點保護**
   - 標準化 404 回應格式
   - 移除端點存在性線索
   - 檔案：`workers/src/index.ts`

### P1 - 短期（2 週內）
3. **速率限制機制**
   - 實作 404 錯誤速率限制
   - 每 IP 每分鐘 20 次限制
   - 使用 Cloudflare KV 或 Durable Objects

4. **管理 API 錯誤優化**
   - 區分公開/管理 API 錯誤詳細度
   - 實作 `adminErrorResponse()`
   - 保持除錯友善性

### P2 - 中期（1 個月內）
5. **回應時間標準化**
   - 防止時序攻擊
   - 所有錯誤回應加入標準延遲
   - 測試效能影響

6. **安全事件監控**
   - 實作 `security_events` 表
   - 記錄端點枚舉嘗試
   - 異常模式偵測

### P3 - 長期（持續改進）
7. **告警系統**
   - 整合 Cloudflare Workers Analytics
   - 設定異常流量告警
   - 自動化回應機制

8. **安全儀表板**
   - 視覺化安全事件
   - 攻擊模式分析
   - 趨勢報告

## 實作檢查清單

### Phase 1: 錯誤回應標準化
- [ ] 創建 `publicErrorResponse()` 函數
- [ ] 創建 `adminErrorResponse()` 函數
- [ ] 更新 `index.ts` 404 處理
- [ ] 更新所有公開 API 端點
- [ ] 單元測試
- [ ] 部署到 staging
- [ ] 驗證無資訊洩露

### Phase 2: 速率限制
- [ ] 設計速率限制架構
- [ ] 實作 `rateLimitMiddleware()`
- [ ] 整合到主路由
- [ ] 配置 KV namespace
- [ ] 測試限制觸發
- [ ] 監控誤判率
- [ ] 調整閾值

### Phase 3: 監控與告警
- [ ] 創建 `security_events` 資料表
- [ ] 實作 `logSecurityEvent()`
- [ ] 整合到錯誤處理流程
- [ ] 設定告警規則
- [ ] 建立查詢 API
- [ ] 開發分析工具

## 測試策略

### 安全測試
```bash
# 端點枚舉測試
for i in {1..30}; do
  curl -s https://your-domain/api/invalid$i | jq .
done

# 預期：前 20 次返回 404，第 21 次返回 429

# 時序攻擊測試
time curl https://your-domain/api/nonexistent
time curl https://your-domain/api/admin/cards

# 預期：回應時間差異 < 50ms
```

### 功能測試
- 正常請求不受影響
- 管理 API 錯誤仍可除錯
- CORS 正常運作
- 審計日誌正確記錄

## 效能影響評估

### 預期影響
- 標準延遲：+100ms（僅錯誤回應）
- 速率限制：+5ms（KV 查詢）
- 審計日誌：+10ms（非同步寫入）

### 監控指標
- P95 回應時間
- 錯誤率
- KV 讀寫延遲
- D1 寫入延遲

## 回滾計劃

### 觸發條件
- P95 回應時間增加 > 200ms
- 錯誤率增加 > 5%
- 正常請求被誤判為攻擊

### 回滾步驟
1. 切換到前一版本部署
2. 停用速率限制中介層
3. 恢復原始錯誤回應格式
4. 分析問題根因
5. 修正後重新部署

## 成功指標

### 安全指標
- 錯誤訊息不洩露系統資訊
- 端點枚舉攻擊被有效阻擋
- 無時序攻擊成功案例

### 功能指標
- 正常請求成功率 > 99.9%
- 管理 API 除錯效率不降低
- 審計日誌完整性 100%

### 效能指標
- P95 回應時間增加 < 100ms
- 速率限制誤判率 < 0.1%
- 系統可用性 > 99.95%

## 相關文檔
- [error-response-security-hardening.md](error-response-security-hardening.md)
- [ADR-001: 隱私優先設計原則](../../docs/adr/001-privacy-first.md)
- [SECURITY-ASSESSMENT-ADMIN-TOKEN.md](../../docs/SECURITY-ASSESSMENT-ADMIN-TOKEN.md)
